'use client';

import { Navbar } from '@/components/layout/Navbar';
import { CourseCard } from '@/components/courses/CourseCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, BookOpen, X, SlidersHorizontal } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useState, useMemo } from 'react';

export default function CoursesPage() {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses'), where('isActive', '==', true));
  }, [db]);

  const { data: courses, isLoading } = useCollection(coursesQuery);

  const categories = useMemo(() => {
    if (!courses) return [];
    return [...new Set(courses.map((c: any) => c.category).filter(Boolean))];
  }, [courses]);

  const filtered = useMemo(() => {
    if (!courses) return [];
    let result = [...courses];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((c: any) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.technology || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.instructorName || '').toLowerCase().includes(q)
      );
    }
    if (category !== 'all') result = result.filter((c: any) => c.category === category);
    if (priceFilter === 'free') result = result.filter((c: any) => c.isFree);
    if (priceFilter === 'paid') result = result.filter((c: any) => !c.isFree);
    if (sortBy === 'az') result.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
    if (sortBy === 'za') result.sort((a: any, b: any) => (b.title || '').localeCompare(a.title || ''));
    if (sortBy === 'newest') result.sort((a: any, b: any) => {
      const ta = a.createdAt?.toDate?.() || new Date(0);
      const tb = b.createdAt?.toDate?.() || new Date(0);
      return tb.getTime() - ta.getTime();
    });
    if (sortBy === 'price-asc') result.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
    return result;
  }, [courses, search, category, priceFilter, sortBy]);

  const hasFilters = search || category !== 'all' || priceFilter !== 'all';

  const clearFilters = () => { setSearch(''); setCategory('all'); setPriceFilter('all'); setSortBy('newest'); };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-headline font-bold mb-2">Catálogo de Cursos</h1>
          <p className="text-muted-foreground">Descubre habilidades que el mercado necesita hoy.</p>
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Busca cursos, temas, instructores..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-11 border-slate-100 bg-slate-50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl h-11 w-40 bg-slate-50 border-slate-100"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat: string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="rounded-xl h-11 w-36 bg-slate-50 border-slate-100"><SelectValue placeholder="Precio" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="paid">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl h-11 w-40 bg-slate-50 border-slate-100"><SelectValue placeholder="Ordenar" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="az">A → Z</SelectItem>
                  <SelectItem value="za">Z → A</SelectItem>
                  <SelectItem value="price-asc">Menor precio</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={clearFilters} title="Limpiar filtros">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Active filters pills */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-50">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> Filtros activos:</span>
              {search && <Badge variant="secondary" className="rounded-lg text-xs gap-1">{search} <button onClick={() => setSearch('')}><X className="h-2.5 w-2.5" /></button></Badge>}
              {category !== 'all' && <Badge variant="secondary" className="rounded-lg text-xs gap-1">{category} <button onClick={() => setCategory('all')}><X className="h-2.5 w-2.5" /></button></Badge>}
              {priceFilter !== 'all' && <Badge variant="secondary" className="rounded-lg text-xs gap-1">{priceFilter === 'free' ? 'Gratis' : 'Premium'} <button onClick={() => setPriceFilter('all')}><X className="h-2.5 w-2.5" /></button></Badge>}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground font-medium">
            {isLoading ? 'Cargando...' : `${filtered.length} curso${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-[4/3] bg-white animate-pulse rounded-[2.5rem] border border-slate-100" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course: any) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Sin resultados</h3>
            <p className="text-sm text-muted-foreground mb-6">Prueba con otros términos o limpia los filtros.</p>
            <Button variant="outline" className="rounded-xl" onClick={clearFilters}>Limpiar filtros</Button>
          </div>
        )}
      </main>
    </div>
  );
}
