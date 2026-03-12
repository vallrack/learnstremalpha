import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/CourseCard';
import { MOCK_COURSES } from '@/lib/mock-data';
import { Rocket, ShieldCheck, Zap, Sparkles, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const featuredCourses = MOCK_COURSES.slice(0, 3);
  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 lg:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                <Sparkles className="h-4 w-4" />
                AI-Powered Learning Platform
              </div>
              <h1 className="text-4xl lg:text-7xl font-headline font-bold mb-6 leading-tight">
                Master New Skills with <span className="text-primary">LearnStream</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
                Join thousands of students learning from experts in development, design, and business. Start for free and unlock your potential.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/courses">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90">
                    Browse Courses
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold rounded-full gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="flex-1 relative w-full aspect-video lg:aspect-square">
              <div className="absolute inset-0 bg-primary/5 rounded-3xl -rotate-2 scale-105" />
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl">
                <Image 
                  src="https://picsum.photos/seed/learnstream1/1200/600" 
                  alt="LearnStream Platform Preview"
                  fill
                  className="object-cover"
                  data-ai-hint="learning app"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-card border-y">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">Accelerated Learning</h3>
                <p className="text-muted-foreground">Expert-led courses designed to take you from beginner to pro efficiently.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">Certified Courses</h3>
                <p className="text-muted-foreground">Earn recognized certificates upon completion to showcase your expertise.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">AI Powered Assistant</h3>
                <p className="text-muted-foreground">Get instant summaries and answers from our integrated AI lesson assistant.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Courses */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl font-headline font-bold mb-4">Start Learning Today</h2>
                <p className="text-muted-foreground">Choose from our most popular free and premium courses.</p>
              </div>
              <Link href="/courses">
                <Button variant="link" className="text-primary font-semibold p-0 h-auto">View All Courses →</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto rounded-[3rem] bg-primary p-12 lg:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-5xl font-headline font-bold text-white mb-6">Ready to upgrade your career?</h2>
              <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
                Get unlimited access to all courses, projects, and our exclusive AI learning features with a premium subscription.
              </p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-14 px-10 text-lg font-bold rounded-full">
                Get Unlimited Access
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 overflow-hidden rounded-lg">
              <Image 
                src={logoUrl} 
                alt="LearnStream Logo" 
                fill 
                className="object-cover mix-blend-screen brightness-110" 
              />
            </div>
            <span className="font-headline font-bold text-lg">LearnStream</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Support</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 LearnStream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}