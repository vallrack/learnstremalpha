'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Unplug as X, Loader2, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import * as xlsx from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface BulkEnrollmentModalProps {
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

interface StudentRecord {
  name: string;
  email: string;
}

export function BulkEnrollmentModal({ courseId, courseTitle, onSuccess }: BulkEnrollmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<StudentRecord[]>([]);
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState<{total: number, success: number, failed: number, errors: string[]} | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('none');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  const groupsQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'groups'), orderBy('createdAt', 'desc'));
  }, [db, courseId]);
  const { data: groups } = useCollection(groupsQuery);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        
        const mappedData: StudentRecord[] = data.map((row: any) => {
          // Intentar mapear columnas comunes, ignorando mayúsculas/minúsculas
          const keys = Object.keys(row);
          const nameKey = keys.find(k => k.toLowerCase().includes('nombre') || k.toLowerCase().includes('name'));
          const emailKey = keys.find(k => k.toLowerCase().includes('correo') || k.toLowerCase().includes('email'));
          
          return {
            name: nameKey ? row[nameKey] : '',
            email: emailKey ? row[emailKey] : ''
          };
        }).filter(r => r.email); // Solo mantener aquellos con email

        setParsedData(mappedData);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error de lectura",
          description: "No se pudo leer el archivo Excel. Asegúrate de que tiene columnas como 'Nombre' y 'Email'."
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessEnrollment = async () => {
    if (parsedData.length === 0) return;
    
    setIsUploading(true);
    setResults(null);
    
    try {
      const activeUser = auth.currentUser;
      if (!activeUser) throw new Error("Debes iniciar sesión");
      
      const token = await activeUser.getIdToken();
      
      const response = await fetch('/api/admin/bulk-enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          courseTitle,
          groupId: selectedGroupId === 'none' ? null : selectedGroupId,
          students: parsedData
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Ocurrió un error en el servidor");
      }
      
      setResults(data.results);
      toast({
        title: "Proceso Completado",
        description: `Se matricularon ${data.results.success} estudiantes exitosamente.`,
      });
      
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de Importación",
        description: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setFileName('');
    setResults(null);
    setSelectedGroupId('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl shadow-sm border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Importación Masiva de Estudiantes
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx o .csv) para matricular a múltiples estudiantes al curso <strong>{courseTitle}</strong> y darles acceso premium de inmediato.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {results ? (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 ${results.failed === 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                {results.failed === 0 ? (
                  <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-amber-500" />
                )}
                <div>
                  <h3 className="text-xl font-bold">Proceso Finalizado</h3>
                  <p className="opacity-80">De {results.total} estudiantes, {results.success} fueron matriculados exitosamente.</p>
                  {results.failed > 0 && (
                    <p className="text-rose-600 font-bold mt-1">Hubo {results.failed} errores.</p>
                  )}
                </div>
              </div>
              
              {results.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 max-h-[150px] overflow-y-auto text-sm text-rose-800">
                  <span className="font-bold mb-2 block">Lista de Errores:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : parsedData.length > 0 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-xl border gap-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-sm truncate max-w-[200px]">{fileName}</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{parsedData.length} registros</span>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {groups && groups.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Asignar a cohorte:</Label>
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
                          <SelectValue placeholder="Sin cohorte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin cohorte (General)</SelectItem>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-muted-foreground hover:text-rose-600">
                    Cambiar archivo
                  </Button>
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead>Nombre del Estudiante</TableHead>
                      <TableHead>Correo Electrónico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((student, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{student.name || <span className="text-amber-500 italic">No especificado</span>}</TableCell>
                        <TableCell>{student.email}</TableCell>
                      </TableRow>
                    ))}
                    {parsedData.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground italic h-12">
                          ... y {parsedData.length - 50} registros más.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-white p-4 rounded-full shadow-sm"><Upload className="h-8 w-8 text-emerald-500" /></div>
              <div className="text-center">
                <h4 className="font-bold text-slate-800">Haz clic para subir un Excel</h4>
                <p className="text-xs text-muted-foreground mt-1">El archivo debe contener columnas 'Nombre' y 'Email'</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
              />
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" className="rounded-xl h-11" onClick={() => setIsOpen(false)}>
            {results ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!results && (
            <Button 
              onClick={handleProcessEnrollment} 
              disabled={parsedData.length === 0 || isUploading} 
              className="rounded-xl h-11 gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando Matriculas...</> : 'Procesar e Inscribir'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
