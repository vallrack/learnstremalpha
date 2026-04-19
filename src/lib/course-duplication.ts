/**
 * Clona el contenido de un curso (módulos, lecciones, recursos) usando la API del servidor.
 * @param idToken Token de ID de Firebase del usuario actual
 * @param sourceCourseId ID del curso origen
 * @param targetCourseId ID del curso destino
 * @param instructorId ID del instructor propietario
 * @param options Opciones de importación selectiva
 */
export async function cloneCourseContent(
  idToken: string,
  sourceCourseId: string,
  targetCourseId: string,
  instructorId: string,
  options: {
    moduleIds?: string[];
    startOrderIndex?: number;
  } = {}
) {
  const response = await fetch('/api/admin/clone-course', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      sourceCourseId,
      targetCourseId,
      instructorId,
      options
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al clonar el contenido del curso');
  }

  return await response.json();
}

