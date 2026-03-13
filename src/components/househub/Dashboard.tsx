import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Member, House, CleanRecord, Purchase, ActivityLog,
  RotationEntry, SupplyResponsibility, Supply, SUPPLIES,
  uid, now, nextSat, todayFull, buildRotation,
} from "@/lib/househub";
import HomeTab     from "./HomeTab";
import CleaningTab from "./CleaningTab";
import SuppliesTab from "./SuppliesTab";
import HistoryTab  from "./HistoryTab";
import { houseService } from "@/services/houseService";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Share2, Check } from "lucide-react";

interface DashboardProps {
  initialUser:                   Member;
  initialHouse:                  House;
  initialMembers:                Member[];
  initialCleanRecs:              CleanRecord[];
  initialPurchases:              Purchase[];
  initialLog:                    ActivityLog[];
  initialRotation:               RotationEntry[];
  initialSupplyResponsibilities: SupplyResponsibility[];
  onLeaveHouse:                  () => void;
}

interface UndoAction {
  label:   string;
  execute: () => Promise<void>;
}

const Dashboard = ({
  initialUser,
  initialHouse,
  initialMembers,
  initialCleanRecs,
  initialPurchases,
  initialLog,
  initialRotation,
  initialSupplyResponsibilities,
  onLeaveHouse,
}: DashboardProps) => {

  const [tab,          setTab]         = useState("home");
  const [members]                      = useState(initialMembers);
  const [rotation,     setRotation]    = useState(initialRotation);
  const [cleanRecs,    setCleanRecs]   = useState(initialCleanRecs);
  const [purchases,    setPurchases]   = useState(initialPurchases);
  const [actLog,       setActLog]      = useState(initialLog);
  const [supplyResps,  setSupplyResps] = useState(initialSupplyResponsibilities);
  const [user]                         = useState(initialUser);
  const [house]                        = useState(initialHouse);
  const [toast,        setToast]       = useState<{ msg: string; id: number } | null>(null);
  const [undoAction,   setUndoAction]  = useState<UndoAction | null>(null);
  const [showLeave,    setShowLeave]   = useState(false);
  const [copied,       setCopied]      = useState(false);
  const [tabAnim,      setTabAnim]     = useState(false);
  const undoTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────
  const getMember = useCallback(
    (id: string) => members.find(m => m.id === id),
    [members]
  );

  const showToast = useCallback((msg: string, undo?: UndoAction) => {
    setToast({ msg, id: Date.now() });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (undo) {
      setUndoAction(undo);
      undoTimer.current = setTimeout(() => { setUndoAction(null); setToast(null); }, 5000);
    } else {
      setUndoAction(null);
      undoTimer.current = setTimeout(() => setToast(null), 3200);
    }
  }, []);

  const dismissToast = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setToast(null);
    setUndoAction(null);
  };

  // Animate tab content on switch
  const switchTab = (t: string) => {
    setTabAnim(true);
    setTimeout(() => { setTab(t); setTabAnim(false); }, 120);
  };

  // ── Share code ─────────────────────────────────────────────────────
  const shareCode = useCallback(() => {
    const url = `${window.location.origin}?code=${house.house_code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [house.house_code]);

  // ── Real-time subscriptions ────────────────────────────────────────
  useEffect(() => {
    const cleanSub = supabase
      .channel(`clean_records:${house.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clean_records", filter: `house_id=eq.${house.id}` },
        payload => {
          const newRec = payload.new as CleanRecord;
          setCleanRecs(prev => {
            if (prev.some(r => r.id === newRec.id)) return prev;
            const updated = [newRec, ...prev];
            const lastCleanerIdx = members.findIndex(m => m.id === newRec.member_id);
            setRotation(buildRotation(members, Math.max(0, lastCleanerIdx)));
            return updated;
          });
        })
      .subscribe();

    const purchaseSub = supabase
      .channel(`purchases:${house.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "purchases", filter: `house_id=eq.${house.id}` },
        payload => {
          const p = payload.new as Purchase;
          setPurchases(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev]);
        })
      .subscribe();

    const supplyRespSub = supabase
      .channel(`supply_responsibilities:${house.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "supply_responsibilities", filter: `house_id=eq.${house.id}` },
        payload => {
          const u = payload.new as SupplyResponsibility;
          setSupplyResps(prev => prev.map(r => r.id === u.id ? u : r));
        })
      .subscribe();

    return () => {
      supabase.removeChannel(cleanSub);
      supabase.removeChannel(purchaseSub);
      supabase.removeChannel(supplyRespSub);
    };
  }, [house.id, members]);

  // ── Derived state ──────────────────────────────────────────────────
  const thisRotation  = rotation[0] ?? null;
  const thisCleanMbr  = getMember(thisRotation?.memberId ?? "");
  const isMyTurnClean = thisRotation?.memberId === user?.id;
  const myNextClean   = rotation.find(r => r.memberId === user?.id);
  const lastCleanRec  = cleanRecs[0];
  const lastCleanMbr  = getMember(lastCleanRec?.member_id ?? "");

  const nextBuyerByItem = useMemo(() => {
    const map: Record<string, Member | null> = {};
    SUPPLIES.forEach(s => {
      const resp = supplyResps.find(r => r.item_name === s.label);
      map[s.label] = resp ? (getMember(resp.next_member_id) ?? null) : null;
    });
    return map;
  }, [supplyResps, getMember]);

  const nextBuyer = useMemo(() => {
    for (const s of SUPPLIES) {
      const b = nextBuyerByItem[s.label];
      if (b) return b;
    }
    if (!members.length) return null;
    const recentIds = purchases.slice(0, members.length).map(p => p.member_id);
    return members.find(m => !recentIds.includes(m.id)) ?? members[0];
  }, [nextBuyerByItem, members, purchases]);

  const lastBoughtMap = useMemo(() => {
    const map: Record<string, Purchase> = {};
    SUPPLIES.forEach(s => {
      const p = purchases.find(x => x.item_name === s.label);
      if (p) map[s.id] = p;
    });
    return map;
  }, [purchases]);

  // ── doClean ────────────────────────────────────────────────────────
  const doClean = useCallback(async () => {
    if (!user) return;
    const today  = new Date().toISOString().split("T")[0];
    const tempId = uid();
    const prevCleanRecs = cleanRecs;
    const prevRotation  = rotation;

    const newRec: CleanRecord = { id: tempId, member_id: user.id, house_id: house.id, date: today };
    setCleanRecs(prev => [newRec, ...prev]);
    setRotation(prev => {
      if (!prev.length) return prev;
      const rest   = prev.slice(1);
      const last   = prev[prev.length - 1];
      return [...rest, { memberId: prev[0].memberId, date: nextSat(new Date(last.date.getTime() + 86400000)) }];
    });
    setActLog(prev => [{ id: uid(), member_id: user.id, action: `${user.name} cleaned the house`, icon: "🧹", created_at: now() }, ...prev]);

    let realId: string | null = null;
    try {
      const { data, error } = await supabase.from("clean_records").insert({ house_id: house.id, member_id: user.id, date: today }).select().single();
      if (error) throw error;
      realId = data.id;
      setCleanRecs(prev => prev.map(r => r.id === tempId ? { ...r, id: realId! } : r));
    } catch (err) { console.error("Failed to save clean record:", err); }

    showToast("🧹 Cleaning marked as done!", {
      label: "Undo",
      execute: async () => {
        setCleanRecs(prevCleanRecs);
        setRotation(prevRotation);
        if (realId) {
          try { await supabase.from("clean_records").delete().eq("id", realId); }
          catch (err) { console.error("Undo failed:", err); }
        }
      },
    });
  }, [user, house, cleanRecs, rotation, showToast]);

  // ── doBuy ──────────────────────────────────────────────────────────
  const doBuy = useCallback(async (supply: Supply) => {
    if (!user) return;
    const today  = new Date().toISOString().split("T")[0];
    const tempId = uid();
    const currentResp    = supplyResps.find(r => r.item_name === supply.label);
    const currentBuyerId = currentResp?.next_member_id ?? user.id;
    const currentIdx     = members.findIndex(m => m.id === currentBuyerId);
    const nextMember     = members[(currentIdx + 1) % members.length];
    const prevPurchases  = purchases;
    const prevResps      = supplyResps;

    setPurchases(prev => [{ id: tempId, member_id: user.id, house_id: house.id, item_name: supply.label, date: today }, ...prev]);
    setSupplyResps(prev => prev.map(r => r.item_name === supply.label ? { ...r, next_member_id: nextMember.id } : r));
    setActLog(prev => [{ id: uid(), member_id: user.id, action: `${user.name} bought ${supply.label}`, icon: supply.icon, created_at: now() }, ...prev]);

    let realId: string | null = null;
    try {
      const { data, error } = await supabase.from("purchases").insert({ house_id: house.id, member_id: user.id, item_name: supply.label, date: today }).select().single();
      if (error) throw error;
      realId = data.id;
      setPurchases(prev => prev.map(p => p.id === tempId ? { ...p, id: realId! } : p));
      await houseService.updateNextBuyer(house.id, supply.label, nextMember.id);
    } catch (err) { console.error("Failed to save purchase:", err); }

    showToast(`${supply.icon} ${supply.label} saved!`, {
      label: "Undo",
      execute: async () => {
        setPurchases(prevPurchases);
        setSupplyResps(prevResps);
        if (realId) {
          try {
            await supabase.from("purchases").delete().eq("id", realId);
            if (currentResp) await houseService.updateNextBuyer(house.id, supply.label, currentBuyerId);
          } catch (err) { console.error("Undo failed:", err); }
        }
      },
    });
  }, [user, house, members, supplyResps, purchases, showToast]);

  const tabs = [
    { id: "home",     label: "Home",     emoji: "🏠" },
    { id: "cleaning", label: "Cleaning", emoji: "🧹" },
    { id: "supplies", label: "Supplies", emoji: "🛒" },
    { id: "history",  label: "History",  emoji: "📋" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">

      {/* ── Header ── */}
      <div className="px-5 pt-10 pb-6 bg-background">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-black text-2xl text-foreground tracking-tight">
              HouseHub
            </h1>
            <div className="flex items-center gap-2">
              {/* Share button */}
              <button
                onClick={shareCode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300
                  ${copied
                    ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/80 hover:shadow-sm active:scale-95"
                  }
                `}
                title="Share house code"
              >
                {copied ? <Check size={12} /> : <Share2 size={12} />}
                {copied ? "Copied!" : house.house_code}
              </button>
              {/* Leave button */}
              <button
                onClick={() => setShowLeave(true)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 active:scale-90"
                title="Leave house"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {todayFull()}
            </p>
            <h2 className="font-display font-black text-4xl text-primary leading-tight">
              Hello, {user?.name.split(" ")[0]} 👋
            </h2>
            <p className="text-muted-foreground text-base mt-1.5">
              Here's what needs to be done.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="max-w-xl mx-auto px-4 mt-1">
        <div className="flex gap-2 p-1 bg-muted/60 rounded-2xl border border-border/50 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`flex-1 min-w-[72px] py-2.5 px-2 rounded-xl font-bold text-sm transition-all duration-250 flex items-center justify-center gap-1.5
                ${tab === t.id
                  ? "bg-background text-foreground shadow-md scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 active:scale-95"
                }
              `}
              onClick={() => switchTab(t.id)}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div
        className="max-w-xl mx-auto mt-6 px-4 transition-all duration-150"
        style={{ opacity: tabAnim ? 0 : 1, transform: tabAnim ? "translateY(6px)" : "translateY(0)" }}
      >
        {tab === "home" && (
          <HomeTab
            lastCleanMbr={lastCleanMbr}
            lastCleanRec={lastCleanRec}
            purchases={purchases}
            actLog={actLog}
            getMember={getMember}
            thisCleanMbr={thisCleanMbr}
            thisRotation={thisRotation}
            nextBuyer={nextBuyer}
            nextBuyerByItem={nextBuyerByItem}
            isMyTurnClean={isMyTurnClean}
            user={user}
            setTab={switchTab}
          />
        )}
        {tab === "cleaning" && (
          <CleaningTab
            rotation={rotation}
            myNextClean={myNextClean}
            user={user}
            getMember={getMember}
            isMyTurnClean={isMyTurnClean}
            doClean={doClean}
            cleanRecs={cleanRecs}
          />
        )}
        {tab === "supplies" && (
          <SuppliesTab
            user={user}
            members={members}
            doBuy={doBuy}
            purchases={purchases}
            getMember={getMember}
            nextBuyerByItem={nextBuyerByItem}
            lastBoughtMap={lastBoughtMap}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            user={user}
            members={members}
            cleanRecs={cleanRecs}
            purchases={purchases}
          />
        )}
      </div>

      {/* ── Leave confirmation ── */}
      {showLeave && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-6"
          style={{ animation: "fade-in 0.2s ease" }}
        >
          <div
            className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border"
            style={{ animation: "slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          >
            <p className="text-3xl mb-3">👋</p>
            <h3 className="font-display font-black text-xl text-foreground mb-2">Leave house?</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              You'll be taken back to the home screen. You can rejoin anytime using the house code{" "}
              <span className="font-bold text-foreground">{house.house_code}</span>.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl bg-muted text-foreground font-bold text-sm hover:bg-muted/80 active:scale-95 transition-all duration-200"
                onClick={() => setShowLeave(false)}
              >
                Stay
              </button>
              <button
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 active:scale-95 transition-all duration-200"
                onClick={onLeaveHouse}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast + Undo ── */}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          style={{ animation: "toast-up 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <div className="flex items-center gap-3 bg-foreground text-background px-5 py-3.5 rounded-2xl font-bold text-sm shadow-2xl whitespace-nowrap border border-white/10">
            <span>{toast.msg}</span>
            {undoAction && (
              <button
                className="ml-1 px-3 py-1 rounded-xl bg-background/20 hover:bg-background/30 text-background font-black text-xs transition-all duration-200 active:scale-95"
                onClick={async () => { dismissToast(); await undoAction.execute(); }}
              >
                Undo
              </button>
            )}
            <button
              className="ml-0.5 text-background/40 hover:text-background transition-colors text-xl leading-none"
              onClick={dismissToast}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fade-in   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up  { from { transform: translateY(20px) scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes toast-up  { from { transform: translate(-50%, 20px) scale(0.9); opacity: 0; } to { transform: translate(-50%, 0) scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Dashboard;
