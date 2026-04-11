import { 
  Firestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp, 
  query, 
  orderBy,
  Timestamp
} from 'firebase/firestore';

/**
 * Deep clones the content (modules, lessons, resources) of a course into another.
 * @param db Firestore instance
 * @param sourceCourseId ID of the course to copy FROM
 * @param targetCourseId ID of the course to copy TO
 * @param instructorId ID of the instructor who will own the new content
 * @param options Selective import options
 */
export async function cloneCourseContent(
  db: Firestore,
  sourceCourseId: string,
  targetCourseId: string,
  instructorId: string,
  options: {
    moduleIds?: string[]; // If provided, only clones these modules
    startOrderIndex?: number; // Starting orderIndex for imported modules
  } = {}
) {
  const { moduleIds, startOrderIndex = 0 } = options;

  // 1. Get modules from source course
  let modulesQuery = query(
    collection(db, 'courses', sourceCourseId, 'modules'),
    orderBy('orderIndex', 'asc')
  );
  
  const modulesSnapshot = await getDocs(modulesQuery);
  const sourceModules = modulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // Filter modules if selective import is requested
  const modulesToClone = moduleIds 
    ? sourceModules.filter(m => moduleIds.includes(m.id))
    : sourceModules;

  for (let i = 0; i < modulesToClone.length; i++) {
    const sourceModule: any = modulesToClone[i];
    const originalModuleId = sourceModule.id;

    // 2. Create new module in target course
    const newModuleData = {
      ...sourceModule,
      courseId: targetCourseId,
      instructorId: instructorId,
      orderIndex: startOrderIndex + i,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    delete newModuleData.id; // Remove the old ID

    const moduleRef = await addDoc(collection(db, 'courses', targetCourseId, 'modules'), newModuleData);
    const newModuleId = moduleRef.id;

    // 3. Get lessons for this module
    const lessonsSnapshot = await getDocs(
      query(collection(db, 'courses', sourceCourseId, 'modules', originalModuleId, 'lessons'), orderBy('orderIndex', 'asc'))
    );

    for (const lessonDoc of lessonsSnapshot.docs) {
      const sourceLesson = lessonDoc.data();
      const originalLessonId = lessonDoc.id;

      // 4. Create new lesson
      const newLessonData = {
        ...sourceLesson,
        moduleId: newModuleId,
        instructorId: instructorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const lessonRef = await addDoc(
        collection(db, 'courses', targetCourseId, 'modules', newModuleId, 'lessons'), 
        newLessonData
      );
      const newLessonId = lessonRef.id;

      // 5. Copy Premium Data (Subcollection premium/data)
      const premiumRef = doc(db, 'courses', sourceCourseId, 'modules', originalModuleId, 'lessons', originalLessonId, 'premium', 'data');
      const premiumSnap = await getDoc(premiumRef);
      
      if (premiumSnap.exists()) {
        const premiumData = premiumSnap.data();
        await setDoc(
          doc(db, 'courses', targetCourseId, 'modules', newModuleId, 'lessons', newLessonId, 'premium', 'data'),
          {
            ...premiumData,
            updatedAt: serverTimestamp()
          }
        );
      }

      // 6. Copy Resources (Subcollection resources)
      const resourcesSnapshot = await getDocs(
        collection(db, 'courses', sourceCourseId, 'modules', originalModuleId, 'lessons', originalLessonId, 'resources')
      );

      for (const resourceDoc of resourcesSnapshot.docs) {
        const resourceData = resourceDoc.data();
        const newResourceData = {
          ...resourceData,
          lessonId: newLessonId,
          instructorId: instructorId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(
          collection(db, 'courses', targetCourseId, 'modules', newModuleId, 'lessons', newLessonId, 'resources'),
          newResourceData
        );
      }
    }
  }

  return true;
}
