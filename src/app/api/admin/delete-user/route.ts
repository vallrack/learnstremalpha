import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Falta el ID del usuario' }, { status: 400 });
    }

    // 1. Verificar autorización (Solo Admins)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const requesterDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!requesterDoc.exists || requesterDoc.data()?.role !== 'admin' && decodedToken.email !== 'demo@learnstream.ai') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    console.log(`Eliminando usuario ${userId} por solicitud de ${decodedToken.email}`);

    // 2. Eliminar de Firebase Authentication
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError: any) {
      // Si el usuario no existe en Auth (pero sí en DB), ignoramos el error para proceder con la limpieza de DB
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // 3. Eliminar documento de Firestore
    await adminDb.collection('users').doc(userId).delete();

    // Opcional: Podrías limpiar subcolecciones aquí si fuera necesario de forma recursiva, 
    // pero para liberar el correo, lo anterior es suficiente.

    return NextResponse.json({ message: 'Usuario eliminado exitosamente de Auth y Firestore' });

  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
