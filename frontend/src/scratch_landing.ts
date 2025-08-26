// import React from "react";
// import { motion } from "framer-motion";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";

// /**
//  * WeblerLandingPage
//  * - Hero section with headline, subtext, call-to-action.
//  * - SVG illustrations + animated backgrounds.
//  * - Features grid: Learn, Q&A, Blog, Try Code.
//  * - Sign-up form section.
//  * - Footer with links.
//  */

// export default function WeblerLandingPage() {
//   return (
//     <div className="min-h-screen flex flex-col bg-background text-foreground">
//       {/* Hero */}
//       <header className="relative overflow-hidden">
//         <div className="absolute inset-0 -z-10">
//           <svg className="w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1440 320"><path fill="currentColor" d="M0,256L60,245.3C120,235,240,213,360,208C480,203,600,213,720,229.3C840,245,960,267,1080,250.7C1200,235,1320,181,1380,154.7L1440,128V0H0Z"></path></svg>
//         </div>
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
//           <motion.h1
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5 }}
//             className="text-4xl sm:text-6xl font-bold tracking-tight"
//           >
//             Learn. Build. Share.
//           </motion.h1>
//           <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
//             Webler is a community of independent coders. Learn courses, ask & answer questions, read blogs, and try code — all in one place.
//           </p>
//           <div className="mt-8 flex flex-wrap justify-center gap-4">
//             <Button size="lg" className="rounded-2xl">Get Started</Button>
//             <Button size="lg" variant="outline" className="rounded-2xl">Browse Courses</Button>
//           </div>
//         </div>
//       </header>

//       {/* Features */}
//       <section className="py-20 bg-muted/30">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
//           <h2 className="text-2xl sm:text-3xl font-semibold">What you can do on Webler</h2>
//           <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
//             {[
//               { title: "Learn Courses", desc: "Interactive coding lessons with hands-on projects.", svg: "📘" },
//               { title: "Q&A", desc: "Ask questions, get answers, and help others.", svg: "💬" },
//               { title: "Blog", desc: "Share your knowledge and read stories from developers.", svg: "✍️" },
//               { title: "Try Code", desc: "Experiment and run code directly in your browser.", svg: "💻" },
//             ].map(({ title, desc, svg }) => (
//               <motion.div
//                 key={title}
//                 whileHover={{ scale: 1.05 }}
//                 className="rounded-2xl border bg-card shadow-sm p-6 flex flex-col items-center text-center"
//               >
//                 <div className="text-5xl mb-4">{svg}</div>
//                 <h3 className="text-lg font-semibold">{title}</h3>
//                 <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Signup */}
//       <section className="py-20 relative">
//         <div className="absolute inset-0 -z-10">
//           <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10" preserveAspectRatio="none" viewBox="0 0 1440 320"><path fill="currentColor" d="M0,64L60,90.7C120,117,240,171,360,181.3C480,192,600,160,720,165.3C840,171,960,213,1080,213.3C1200,213,1320,171,1380,149.3L1440,128V0H0Z"></path></svg>
//         </div>
//         <div className="mx-auto max-w-2xl text-center px-4">
//           <h2 className="text-2xl sm:text-3xl font-semibold">Join Webler today</h2>
//           <p className="mt-2 text-muted-foreground">Sign up and become part of a growing network of independent coders.</p>
//           <form className="mt-8 flex flex-col sm:flex-row gap-3">
//             <Input type="email" placeholder="Enter your email" className="rounded-2xl flex-1" />
//             <Button type="submit" className="rounded-2xl">Sign Up</Button>
//           </form>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="border-t mt-auto">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
//           <p>© {new Date().getFullYear()} Webler. Independent coders united.</p>
//           <div className="flex items-center gap-4">
//             <a className="hover:underline" href="#">About</a>
//             <a className="hover:underline" href="#">Privacy</a>
//             <a className="hover:underline" href="#">Terms</a>
//             <a className="hover:underline" href="#">Contact</a>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
