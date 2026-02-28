"use client";
import Link from "next/link";
import { useTheme } from "../contexts/ThemeContext";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Refs for animations
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const shareNowRef = useRef(null);
  const shareButtonsRef = useRef(null);
  const phoneRef = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Amazing hero text animations
    const tl = gsap.timeline({ delay: 0.5 });

    // Animate each word with spectacular effects
    const words = titleRef.current.querySelectorAll('.hero-word');

    // Initial setup - hide all words
    gsap.set(words, {
      y: 100,
      opacity: 0,
      rotationX: 90,
      transformOrigin: "50% 50% -50px"
    });

    // Animate words one by one with amazing effects
    words.forEach((word, index) => {
      tl.to(word, {
        y: 0,
        opacity: 1,
        rotationX: 0,
        duration: 0.8,
        ease: "back.out(1.7)",
        onComplete: () => {
          // Add glow effect to important words
          if (word.classList.contains('glow-word')) {
            gsap.to(word, {
              textShadow: "0 0 20px #84cc16, 0 0 40px #84cc16, 0 0 60px #84cc16",
              duration: 0.5,
              yoyo: true,
              repeat: 1
            });
          }
        }
      }, index * 0.15);
    });

    // Animate subtitle with typewriter effect
    tl.fromTo(subtitleRef.current,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out"
      },
      "-=0.5"
    );



    // Smooth scroll-triggered animations for hero elements
    gsap.to(titleRef.current, {
      y: -50,
      opacity: 0.3,
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      }
    });

    gsap.to(subtitleRef.current, {
      y: -30,
      opacity: 0.5,
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 0.3,
      }
    });

    // Animate the "Want to share" section
    gsap.fromTo(shareNowRef.current.querySelector('h2'),
      { y: 100, opacity: 0, scale: 0.8 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: shareNowRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // Animate the share buttons
    gsap.fromTo(shareButtonsRef.current.children,
      { y: 80, opacity: 0, scale: 0.8 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "elastic.out(1, 0.5)",
        scrollTrigger: {
          trigger: shareNowRef.current,
          start: "top 70%",
          end: "bottom 30%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // Scroll-triggered animations
    gsap.fromTo(section2Ref.current,
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section2Ref.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    gsap.fromTo(phoneRef.current,
      { x: -100, opacity: 0, rotation: -5 },
      {
        x: 0,
        opacity: 1,
        rotation: 0,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section3Ref.current,
          start: "top 70%",
          end: "bottom 30%",
          toggleActions: "play none none reverse"
        }
      }
    );

    gsap.fromTo(section4Ref.current.children,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section4Ref.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className={`${isDark ? 'bg-black' : 'bg-white'} text-white overflow-x-hidden`}>

      {/* Hero Section */}
      <section ref={heroRef} className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-lime-400/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-blue-400/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse delay-500"></div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 via-transparent to-blue-400/5"></div>
        </div>
        <div className="max-w-7xl mx-auto text-center">

          {/* Main Title */}
          <div ref={titleRef} className="mb-8 mt-5">
            <h1 className="text-6xl md:text-8xl lg:text-8xl font-black leading-tight">
              <span className="hero-word glow-word text-white inline-block mr-4">Smart,</span>
              <span className="hero-word text-gray-500 inline-block mr-4">safe,</span>
              <span className="hero-word text-gray-400 inline-block">and</span>
              <br />
              <span className="hero-word text-gray-600 inline-block mr-4">fast</span>
              <span className="hero-word glow-word text-white inline-block mr-4">sharing</span>
              <span className="hero-word text-gray-300 inline-block mr-4">just</span>
              <span className="hero-word text-gray-400 inline-block">a</span>
              <br />
              <span className="hero-word glow-word text-lime-400 inline-block mr-4">tap</span>
              <span className="hero-word text-gray-700 inline-block">away</span>
            </h1>
          </div>

          {/* Subtitle */}
          <div ref={subtitleRef} className="mb-12">
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Experience the future of file sharing with{" "}
              <span className="text-lime-400 font-semibold">zero servers</span>
              , instant connections, and military-grade security.
            </p>
          </div>


        </div>

        {/* Floating Feature Tags */}
        {/* <div className="absolute top-1/4 left-10 hidden lg:block">
          <div className="px-3 py-1 bg-red-500/20 rounded-full border border-red-500/30 backdrop-blur-md">
            <span className="text-red-400 text-sm">🔴 Real-time sharing</span>
          </div>
        </div> */}
        {/* <div className="absolute top-1/3 right-10 hidden lg:block">
          <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30 backdrop-blur-md">
            <span className="text-green-400 text-sm">✅ Features</span>
          </div>
        </div> */}
        {/* <div className="absolute bottom-1/4 right-20 hidden lg:block">
          <div className="px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30 backdrop-blur-md">
            <span className="text-orange-400 text-sm">🔥 Instant file booking</span>
          </div>
        </div> */}
      </section>

      {/* New Section - Want to Share */}
      <section ref={shareNowRef} className="h-screen flex flex-col justify-center items-center px-6 bg-black relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/5 w-40 h-40 bg-lime-400/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/5 w-56 h-56 bg-cyan-400/10 rounded-full blur-2xl animate-pulse delay-700"></div>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10 px-4">
          {/* Main Title */}
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-8">
              <span className="text-white">Want to</span>
              <br />
              <span className="text-lime-400">share?</span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Start sharing files instantly with our secure peer-to-peer platform
            </p>
          </div>

          {/* Action Buttons */}
          <div ref={shareButtonsRef} className="flex flex-col sm:flex-row justify-center gap-6 max-w-lg mx-auto">
            <Link
              href="/create"
              className="group px-8 py-4 bg-lime-400 text-black rounded-full font-bold text-lg hover:bg-lime-300 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-lime-400/25"
            >
              <span className="flex items-center justify-center gap-2">
                🚀 Create Session
              </span>
            </Link>
            <Link
              href="/join"
              className="group px-8 py-4 bg-transparent text-white rounded-full font-bold text-lg border-2 border-gray-600 hover:bg-white hover:text-black transition-all duration-300 hover:scale-105 shadow-xl"
            >
              <span className="flex items-center justify-center gap-2">
                🔗 Join Session
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 - Future of Sharing */}
      <section ref={section2Ref} className="min-h-screen flex flex-col justify-center items-center px-6 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-6xl md:text-8xl lg:text-9xl font-black leading-tight mb-8">
            <span className="text-white">Share the future</span>
            <br />
            <span className="text-gray-600">of digital </span>
            <span className="text-white">connectivity.</span>
          </h2>

          {/* <div className="flex flex-wrap justify-center gap-4 mt-12">
            <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30 backdrop-blur-md">
              <span className="text-green-400 text-sm">✅ Features</span>
            </div>
            <div className="px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30 backdrop-blur-md">
              <span className="text-orange-400 text-sm">🔥 Instant file booking</span>
            </div>
          </div> */}
        </div>
      </section>

      {/* Section 3 - Phone Demo */}


      {/* Section 4 - Features */}
      <section ref={section4Ref} className="min-h-[50vh] flex flex-col justify-center px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          {/* <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8">
              Smarter sharing
              <br />
              starts here.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl">
              Our file-share app makes every transfer smooth, safe, and affordable.
              Whether commuting to work, meeting friends, or catching a flight —
              book your share in seconds.
            </p>
          </div> */}

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Instant Sharing</h4>
              <p className="text-gray-400">
                Our file-share app makes every transfer smooth, safe, and affordable.
                Whether commuting to work, meeting friends, or catching a flight —
                book your share in seconds.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Live Tracking</h4>
              <p className="text-gray-400">
                Track your file's location in real-time and share your transfer
                details with friends & family for extra safety, real-time and
                share your trip.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white text-xl font-bold">Safe & Affordable</h4>
              <p className="text-gray-400">
                Verified senders, cashless payments, and transparent fares —
                giving you peace of mind on every ride, cashless payments, and
                transparent fares.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 bg-black border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Ready to experience the future of file sharing?
          </h3>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/create"
              className="px-8 py-4 bg-lime-400 text-black rounded-full font-bold text-lg hover:bg-lime-300 transition-all duration-300 hover:scale-105"
            >
              Start Sharing Now
            </Link>
            <Link
              href="/join"
              className="px-8 py-4 bg-gray-800 text-white rounded-full font-bold text-lg border border-gray-600 hover:bg-gray-700 transition-all duration-300 hover:scale-105"
            >
              Join a Session
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}