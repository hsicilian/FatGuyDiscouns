"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { synchronizePushAccount } from "./browser-account";

import type { CSSProperties } from "react";



const buttonStyle: CSSProperties = { background: "#bb4d00", color: "#fff", border: "1px solid transparent", borderRadius: 999, padding: "12px 20px", font: "inherit", fontWeight: 700, minHeight: 46, cursor: "pointer", maxWidth: "100%" };

const secondaryStyle: CSSProperties = { ...buttonStyle, background: "transparent", color: "var(--accent-strong)", borderColor: "var(--line)" };

const choiceStyle: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 12, padding: 18, borderRadius: 18, border: "1px solid var(--line)", background: "rgba(255,255,255,0.56)", cursor: "pointer" };



export async function pushRequest(input: unknown) {

  const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });

  const data = await response.json();

  if (!response.ok) throw new Error(data.error || "Notification request failed.");

  return data;

}

function keyBytes(value: string): Uint8Array<ArrayBuffer> {

  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));

  return Uint8Array.from(raw, c => c.charCodeAt(0));

}

export function NotificationSettings({ collapsible = false }: { collapsible?: boolean }) {

  const [config, setConfig] = useState<any>(null);

  const [sales, setSales] = useState(false);

  const [invoices, setInvoices] = useState(false);

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const [active, setActive] = useState(false);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");

  const [deviceStatus, setDeviceStatus] = useState<"loading" | "ready" | "blocked" | "unsupported" | "error">("loading");

  const changing = useRef(false);
  const [statusTarget, setStatusTarget] = useState<HTMLElement | null>(null);

  const [phone, setPhone] = useState<"ios" | "android" | "other">("other");

  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    if (collapsible) setStatusTarget(document.getElementById("phone-notification-status"));

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setPhone(ios ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "other");

    setNeedsInstall(ios && !(window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone));

    let disposed = false;

    (async () => {

      const response = await fetch("/api/push", { cache: "no-store" });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      if (disposed) return;

      setConfig(data); setSales(data.preferences?.sales === true); setInvoices(data.preferences?.invoices === true);

      if (!data.enabled) return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setDeviceStatus("unsupported"); return; }

      setDeviceStatus(Notification.permission === "denied" ? "blocked" : "loading");

      await synchronizePushAccount(data.userId);

      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });

      const reg = await navigator.serviceWorker.ready;

      if (disposed) return;

      setRegistration(reg);

      const sub = await reg.pushManager.getSubscription();
      const state = await pushRequest({ op: "reconcile", subscription: sub?.toJSON() ?? null });
      if (state.switched && sub) await sub.unsubscribe();
      if (!disposed) setActive(state.active && Notification.permission === "granted");
      // Repair a lost browser registration only with an active same-account server
      // registration, saved consent and already-granted permission. Inactive rows
      // require the visible recovery action; they may represent an explicit opt-out.
      if (!sub && state.restore && Notification.permission === "granted" && (data.preferences?.sales || data.preferences?.invoices)) {
        const replacement = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.publicKey) });
        await pushRequest({ op: "subscribe", subscription: replacement.toJSON() });
        if (!disposed) setActive(true);
      }

      if (!disposed) setDeviceStatus(Notification.permission === "denied" ? "blocked" : "ready");

    })().catch(error => { if (!disposed) { setDeviceStatus("error"); setMessage(error.message); } });

    return () => { disposed = true; };

  }, []);

  async function run(task: () => Promise<void>) {

    if (changing.current) return;

    changing.current = true;

    setBusy(true); setMessage("");

    try { await task(); } catch (error: any) { setMessage(error.message); } finally { changing.current = false; setBusy(false); }

  }

  async function enable() {

    if (needsInstall) throw new Error("Add FGD to your Home Screen, then open it from that icon to turn on notifications.");

    if (!registration || !config?.publicKey || deviceStatus !== "ready") throw new Error("Notifications aren’t ready on this phone. Check the help below and try again.");

    // Called directly from a button; required by iOS permission rules.

    const permission = await Notification.requestPermission();

    setDeviceStatus(permission === "denied" ? "blocked" : "ready");

    if (permission !== "granted") throw new Error("Notifications were not allowed. You can change this in your browser settings.");

    let sub = await registration.pushManager.getSubscription();

    if (sub && !await pushRequest({ op: "device", endpoint: sub.endpoint }).then(d => d.active)) { await sub.unsubscribe(); sub = null; }

    sub ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) });

    await pushRequest({ op: "subscribe", subscription: sub.toJSON() });

    setActive(true); setMessage("This phone is ready for your chosen notifications.");

  }



  function changeChoice(category: "sales" | "invoices", checked: boolean) {

    return run(async () => {

      // Request permission directly in the switch gesture, before any API await.

      if (checked && !active) await enable();

      const nextSales = category === "sales" ? checked : sales;

      const nextInvoices = category === "invoices" ? checked : invoices;

      await pushRequest({ op: "preferences", sales: nextSales, invoices: nextInvoices });

      setSales(nextSales); setInvoices(nextInvoices);

      setMessage("Your choices are saved.");

    });

  }

  async function disableDevice() {

    await pushRequest({ op: "unsubscribe" });

    setActive(false);

    await (await registration?.pushManager.getSubscription())?.unsubscribe();

    setMessage("Notifications are off on this phone. Your choices for other devices are unchanged.");

  }

  if (config && !config.enabled) return null;

  {
    const checking = !config || deviceStatus === "loading";
    const ready = active && deviceStatus === "ready" && !needsInstall;
    const status = <section aria-label="Phone notification status" style={{ padding: 18, border: "1px solid var(--line)", borderRadius: 20, background: "var(--panel)", marginBottom: 24, lineHeight: 1.5 }}>
      <strong>{deviceStatus === "error" ? "Phone notification status unavailable" : checking ? "Checking phone notifications…" : needsInstall ? "Open FGD from your Home Screen" : deviceStatus === "blocked" ? "Phone notifications are blocked" : deviceStatus === "unsupported" ? "Phone notifications are not supported here" : ready ? "Phone notifications are on." : "Phone notifications are off."}</strong>
      {deviceStatus === "error" ? <p>We couldn’t check this phone. Reload to try again. Your saved choices have not changed.</p> : checking ? <p>Please wait while we check this phone.</p> : needsInstall ? <p>On iPhone or iPad, add FGD to your Home Screen from Safari’s Share menu, then open that app to turn on notifications.</p> : deviceStatus === "blocked" ? <p>Allow FGD notifications in your browser or phone settings, then reload this page.</p> : deviceStatus === "unsupported" ? <p>Try Chrome on Android, or open FGD from your iPhone Home Screen. Installation help is at the bottom of this page.</p> : ready ? <>
        <p>Selected alerts: {[sales && "Sale announcements", invoices && "Payment reminders"].filter(Boolean).join(" and ") || "None yet. Choose your alert categories in Phone Notification Settings below."}</p>
        <small>This phone is registered with FGD. Registration does not guarantee that every alert appears on your phone.</small>
      </> : <>
        <p>This phone is not set up to receive FGD alerts.</p>
        <button style={buttonStyle} disabled={busy || !registration || !config?.enabled} onClick={() => run(enable)}>{busy ? "Turning on…" : "Turn on phone notifications"}</button>
        <p style={{ fontSize: 14 }}>Your saved alert choices will be kept. No categories are turned on automatically.</p>
      </>}
      <p role="status" aria-live="polite" style={{ marginBottom: 0 }}>{busy ? "Updating this phone…" : message}</p>
    </section>;
    const settings = <details id="phone-notification-settings" style={{ marginTop: 24, border: "1px solid var(--line)", borderRadius: 20, background: "var(--panel)", padding: 18, lineHeight: 1.6 }}>
      <summary style={{ cursor: "pointer", minHeight: 44, color: "var(--accent-strong)", fontWeight: 700 }}>Phone Notification Settings <span style={{ display: "block", fontWeight: 400, fontSize: 14 }}>Installation help and account-wide alert choices</span></summary>
      {ready ? <>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
          <legend style={{ fontWeight: 700 }}>Change alert categories</legend>
          <p>These choices save automatically for your account on every registered device. They are separate from this phone’s registration.</p>
          {([{key:"sales",title:"Sale announcements",checked:sales},{key:"invoices",title:"Payment reminders",checked:invoices}] as const).map(choice => <label key={choice.key} style={{ ...choiceStyle, marginBottom: 12, minHeight: 48, alignItems: "center" }}>
            <input type="checkbox" aria-label={choice.title} checked={choice.checked} onChange={e => void changeChoice(choice.key,e.target.checked)} style={{ width: 24, height: 24, flexShrink: 0 }} />{choice.title}
          </label>)}
        </fieldset>
        <button style={secondaryStyle} disabled={busy} onClick={() => run(disableDevice)}>Turn off on this phone</button>
        <p>This affects only this phone. Your account’s alert choices and other phones stay unchanged. Signing out does not turn notifications off.</p>
      </> : <p>Set up this phone using the status panel above before changing alert categories here. Existing account choices are preserved.</p>}
      <h3>Add FGD to your Home Screen</h3>
      {phone !== "android" && <p><strong>iPhone / iPad</strong><br />In Safari, tap Share, then Add to Home Screen. Open FGD from that icon. Push requires iOS/iPadOS 16.4 or later.</p>}
      {phone !== "ios" && <p><strong>Android</strong><br />In Chrome, tap the three-dot menu, then Add to Home screen or Install app. You can also receive notifications in a supported Android browser without installing FGD.</p>}
      <h3>Account-wide opt-out</h3>
      <p>This turns off both alert categories and notifications on every device on your account.</p>
      <button style={secondaryStyle} disabled={busy || !config?.enabled} onClick={() => run(async () => {
        await pushRequest({op:"preferences",sales:false,invoices:false});setSales(false);setInvoices(false);
        await pushRequest({op:"unsubscribe",all:true});setActive(false);
        await (await registration?.pushManager.getSubscription())?.unsubscribe();
        setMessage("Notifications are off on all your devices.");
      })}>Turn off all notifications</button>
    </details>;
    return <>{collapsible && statusTarget ? createPortal(status,statusTarget) : status}{settings}</>;
  }

}
