import { useState, useEffect, useRef } from "react";
import { Home, Sparkles, DoorOpen, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

interface LandingScreenProps {
  onSetup: () => void;
  onJoin:  () => void;
}

const HOW_IT_WORKS = [
  {
    emoji: "🏠",
    title: "Create your house",
    desc:  "One person sets up the house in under 2 minutes — name it, add housemates, and choose what you share together.",
  },
  {
    emoji: "🔑",
    title: "Share the 6-digit code",
    desc:  "A unique code is generated for your house. Housemates enter it once to join. No accounts, no passwords.",
  },
  {
    emoji: "🧹",
    title: "Cleaning rotates automatically",
    desc:  "HouseHub tracks whose turn it is to clean. After someone logs their clean, the schedule moves to the next person.",
  },
  {
    emoji: "🛒",
    title: "Supplies rotate fairly",
    desc:  "Each shared item has its own rotation. When someone buys it, the next person's name appears automatically.",
  },
  {
    emoji: "📋",
    title: "Full history for everyone",
    desc:  "Every clean and purchase is recorded. Anyone can check the History tab to see their own or a housemate's record.",
  },
  {
    emoji: "🔄",
    title: "Always in sync",
    desc:  "The dashboard updates in real time across all devices. No refresh needed.",
  },
];

const FAQS = [
  {
    q: "Do I need to create an account?",
    a: "No. HouseHub uses a 6-digit house code instead of accounts. Enter the code your housemate shares and you're in instantly.",
  },
  {
    q: "What if I log something by mistake?",
    a: "Every action has an Undo button that appears for 5 seconds after logging. Tap it to reverse the action completely.",
  },
  {
    q: "Can we add our own supply items?",
    a: "Yes — during setup you can add any custom item with your own emoji and name. HouseHub adapts to your house's needs.",
  },
  {
    q: "What if someone moves out?",
    a: "The remaining members continue their rotation. New members can join anytime using the same house code.",
  },
  {
    q: "Is our data private?",
    a: "Your house is only accessible to people who know your 6-digit code. Without it, nobody can see your house.",
  },
];

const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            entry.target.classList.remove("hidden-card");
          } else {
            // Remove revealed so it animates again next time
            entry.target.classList.remove("revealed");
            entry.target.classList.add("hidden-card");
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal-card").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
  // No dependency array — re-runs on every render so new cards are observed
};

const LandingScreen = ({ onSetup, onJoin }: LandingScreenProps) => {
  const [openFaq,      setOpenFaq]      = useState<number | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall,   setShowInstall]   = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useScrollReveal();

  useEffect(() => {
    const handleScroll = () => {
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      const current  = window.scrollY;
      setScrollProgress(total > 0 ? (current / total) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setShowInstall(false);
  };

  const visibleSteps = showAllSteps ? HOW_IT_WORKS : HOW_IT_WORKS.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background animate-fade-in relative overflow-x-hidden">
      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 z-50 h-0.5 bg-[#2a9d8f] transition-all duration-100"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-[#2a9d8f] via-[#2a9d8f] to-[#2a9d8f]/80 px-6 py-16 pb-20 text-center relative overflow-hidden shadow-md">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 55% at 50% 100%, hsla(173, 58%, 60%, 0.15), transparent)" }} />
        <div className="relative">
          {/* Floating emoji */}
          <div className="text-7xl mb-4 select-none flex justify-center"
            style={{ animation: "float 4s ease-in-out infinite" }}>
            🏠
          </div>

          {/* Title */}
          <h1 className="font-display font-black text-[42px] text-white tracking-tight mb-3"
            style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 0ms both" }}>
            HouseHub
          </h1>

          {/* Subtitle */}
          <p className="text-white/90 font-medium text-[19px] tracking-wide"
            style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 100ms both" }}>
            Organized House → Happy People
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">

        <p className="font-display font-bold text-2xl mb-6 text-foreground text-center"
          style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 200ms both" }}>
          What would you like to do?
        </p>

        <div className="flex flex-col gap-4 mb-auto">
          {/* Action cards — staggered and interactive */}
          <div style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 200ms both" }}>
            <button
              className="group w-full p-5 rounded-3xl border-2 border-border bg-card text-left flex items-center gap-4 active:scale-[0.96] hover:scale-[1.02] hover:shadow-lg transition-all duration-200 shimmer-btn bg-gradient-to-r from-card via-[#2a9d8f]/5 to-card"
              onClick={onSetup}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#2a9d8f]/10 flex items-center justify-center text-[#2a9d8f] shrink-0 transition-transform duration-300 group-hover:scale-110">
                <Sparkles size={26} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-foreground mb-1 group-hover:text-[#2a9d8f] transition-colors">Set up a new house</div>
                <div className="font-medium text-[15px] text-muted-foreground">Create your house and invite housemates</div>
              </div>
              <ArrowRight className="text-muted-foreground/40 transition-all duration-300 group-hover:text-[#2a9d8f] group-hover:translate-x-1.5" size={24} />
            </button>
          </div>

          <div style={{ animation: "entrance 0.6s cubic-bezier(0.34,1.3,0.64,1) 320ms both" }}>
            <button
              className="group w-full p-5 rounded-3xl border-2 border-border bg-card text-left flex items-center gap-4 active:scale-[0.96] hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
              onClick={onJoin}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#2a9d8f]/10 flex items-center justify-center text-[#2a9d8f] shrink-0 transition-transform duration-300 group-hover:scale-110">
                <DoorOpen size={26} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-foreground mb-1 group-hover:text-[#2a9d8f] transition-colors">Join existing house</div>
                <div className="font-medium text-[15px] text-muted-foreground">Enter your 6-digit house code</div>
              </div>
              <ArrowRight className="text-muted-foreground/40 transition-all duration-300 group-hover:text-[#2a9d8f] group-hover:translate-x-1.5" size={24} />
            </button>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="mt-14">
          <div className="text-center mb-6">
            <p className="text-[15px] font-semibold text-[#2a9d8f] leading-relaxed mb-1">
              New to HouseHub?
            </p>
            <p className="text-sm font-bold text-[#2a9d8f]/90 uppercase tracking-widest">
              Here's how it works
            </p>
          </div>

          {/* Step cards — repeat on scroll */}
          <div className="flex flex-col gap-3">
            {visibleSteps.map((item, i) => (
              <div
                key={i}
                className="reveal-card group flex items-start gap-4 p-4 rounded-3xl border-2 border-border bg-card cursor-pointer hover:border-[#2a9d8f]/50 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2a9d8f]/10 flex items-center justify-center shrink-0 text-xl group-hover:-translate-y-1 group-hover:shadow-lg transition-all duration-300">
                  {item.emoji}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-[15px] text-foreground mb-1 transition-colors group-hover:text-[#2a9d8f]">{item.title}</p>
                  <p className="text-[14px] font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="mt-4 w-full py-3 rounded-3xl border-2 border-dashed border-[#2a9d8f]/30 text-[#2a9d8f] font-semibold text-[14px] flex items-center justify-center gap-1.5 hover:bg-[#2a9d8f]/5 hover:border-[#2a9d8f]/50 active:scale-[0.98] transition-all duration-300"
            onClick={() => setShowAllSteps(v => !v)}
          >
            {showAllSteps
              ? <><ChevronUp size={14} /> Show less</>
              : <><ChevronDown size={14} /> See all {HOW_IT_WORKS.length} features</>
            }
          </button>
        </div>

        {/* ── FAQ ── */}
        <div className="mt-12">
          <div className="text-center mb-6">
            <p className="text-[15px] font-semibold text-[#2a9d8f] leading-relaxed mb-1">
              Got questions?
            </p>
            <p className="text-sm font-bold text-[#2a9d8f]/90 uppercase tracking-widest">
              Common answers
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`reveal-card rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
                    isOpen
                      ? "border-[#2a9d8f]/40 bg-[#2a9d8f]/5 shadow-sm"
                      : "border-border bg-card hover:border-[#2a9d8f]/30 hover:bg-[#2a9d8f]/5"
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 transition-all duration-200"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span className={`font-bold text-[15px] transition-colors duration-200 ${isOpen ? "text-[#2a9d8f]" : "text-foreground"}`}>
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 transition-all"
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)",
                        color: isOpen ? "#2a9d8f" : "rgba(107, 114, 128, 0.4)"
                      }}
                    />
                  </button>
                  {/* Smooth accordion with max-height */}
                  <div
                    style={{
                      maxHeight: isOpen ? "200px" : "0px",
                      overflow: "hidden",
                      transition: "max-height 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)"
                    }}
                  >
                    <div className="px-5 pb-5 text-[14px] font-medium text-muted-foreground leading-relaxed border-t border-[#2a9d8f]/10 pt-3">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showInstall && (
          <div className="mx-auto max-w-md w-full px-6 pb-6 mt-10">
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-4 p-4 rounded-3xl border-2 border-[#2a9d8f]/30 bg-[#2a9d8f]/5 hover:bg-[#2a9d8f]/10 hover:border-[#2a9d8f]/50 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#2a9d8f]/10 flex items-center justify-center shrink-0 text-2xl">
                📲
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-foreground mb-0.5">Install HouseHub</p>
                <p className="text-xs text-muted-foreground font-medium">Add to your home screen for the best experience</p>
              </div>
              <span className="text-[#2a9d8f] font-bold text-sm">Install</span>
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 pt-8 border-t border-border/40 text-center reveal-card">
          <p className="text-[15px] font-semibold text-[#2a9d8f] leading-relaxed mb-1">
            HouseHub keeps shared homes organized and fair.
          </p>
          <p className="text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
            Cleaning schedules and supply responsibilities rotate clearly so everyone always knows whose turn it is.
          </p>
          <p className="text-sm font-bold text-[#2a9d8f]/90 uppercase tracking-widest">
            Simple <span className="inline-block" style={{ animation: "soft-pulse 2s ease-in-out infinite" }}>·</span> Fair <span className="inline-block" style={{ animation: "soft-pulse 2s ease-in-out infinite" }}>·</span> Organized living.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LandingScreen;
