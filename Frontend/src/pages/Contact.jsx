// src/pages/Contact.jsx
//
// Everything the user needs to fill in is marked with a `// FILL IN:` comment
// and an obvious placeholder value -- search this file for "FILL IN" to find
// every spot that needs a real value before shipping.

import { useState } from "react";

// ---------------------------------------------------------------------
// FILL IN: your details here
// ---------------------------------------------------------------------
const CONTACT = {
  address: {
    line1: "Galaxy Novelty ",
    line2: "Near Post Office 835223",
    line3: "Simdega",
  },
  email: "galaxynovelty@gmail.com",
  whatsapp: "+91 9931076119", 
  whatsappDial: "91 9931076119", 

  mobiles: [
    { label: "Sales", number: "+91 9386221222" },
    { label: "Mobile Service", number: "+91 8789272797" },
    { label: "General enquiries", number: "+91 9471777171" },
  ],
  // FILL IN: replace with your own embed URL --
  // Google Maps > search your address > Share > Embed a map > copy the src="..." value
  mapEmbedSrc:
    "https://www.google.com/maps?q=R7uYh9aVYbwzeRhW8+Street,+Simdega,+Jharkhand+835223&output=embed"
};
// ---------------------------------------------------------------------

// Strips spaces/plus so tel:/wa.me links get a clean digit string,
// regardless of how a number is formatted in CONTACT above.
const toDialDigits = (number) => number.replace(/[^\d]/g, "");

const MailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="m4 6.5 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" {...props}>
    <path
      d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.35-1.14A8.5 8.5 0 1 0 12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M9 9.3c.15-.5.55-.5.9-.5h.4c.2 0 .4.05.5.35.2.5.6 1.5.65 1.6.05.15.1.3 0 .5-.1.2-.15.3-.3.45-.15.15-.3.35-.45.45-.15.15-.3.3-.15.6.15.3.7 1.2 1.55 1.95 1.05.95 1.9 1.25 2.2 1.4.3.15.5.15.65-.05.2-.2.7-.8.9-1.1.2-.3.4-.25.65-.15.3.1 1.7.8 2 .95.3.15.5.2.6.35.1.15.1.85-.2 1.65-.3.8-1.65 1.5-2.3 1.55-.6.1-1.35.15-2.15-.15-.5-.15-1.1-.4-1.9-.75-3.35-1.45-5.5-4.9-5.65-5.15-.15-.25-1.35-1.8-1.35-3.4 0-1.6.85-2.4 1.15-2.7.3-.3.65-.35.85-.35Z"
      fill="currentColor"
    />
  </svg>
);

const PhoneIcon = (props) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" {...props}>
    <path
      d="M5 4h3l1.5 4L7.5 9.5a11 11 0 0 0 6 6l1.5-2L19 15v3a2 2 0 0 1-2 2c-6.6 0-12-5.4-12-12a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available -- fail silently, the value is still visible/selectable
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[10.5px] uppercase tracking-wide text-slate-400 hover:text-fuchsia-600 transition-colors duration-150 shrink-0"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

// Small pill action button used for the Call / WhatsApp actions on each
// number. `tone="brand"` gets the signature gradient fill (used for the
// primary WhatsApp action); default is an outlined glass chip.
const ActionButton = ({ href, icon, label, tone = "default", external = false }) => (
  <a
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide rounded-full px-3 py-1.5 border transition-all duration-150 hover:-translate-y-0.5 ${
      tone === "brand"
        ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 border-transparent text-white shadow-[0_10px_24px_-12px_rgba(217,70,239,0.55)] hover:shadow-[0_14px_28px_-12px_rgba(217,70,239,0.65)]"
        : "bg-white/70 backdrop-blur-md border-slate-200 text-slate-600 hover:border-fuchsia-200 hover:text-fuchsia-600"
    }`}
  >
    {icon}
    {label}
  </a>
);

const SectionCard = ({ icon, title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl p-5 shadow-[0_20px_48px_-30px_rgba(217,70,239,0.35)] transition-colors duration-200 hover:border-fuchsia-200">
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-9 h-9 rounded-2xl bg-gradient-to-r from-fuchsia-50 to-cyan-50 border border-slate-200 flex items-center justify-center text-slate-900">
        {icon}
      </span>
      <h3 className="font-display text-[15px] font-semibold text-slate-900">{title}</h3>
    </div>
    {children}
  </div>
);

const Contact = () => {
  return (
    <div className="relative max-w-[100vw] overflow-x-hidden">
      {/* Ambient glow wash, clamped to viewport so it can't cause scroll gap */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-0 w-[min(560px,140vw)] h-[420px] rounded-full bg-gradient-to-r from-fuchsia-300/30 via-cyan-200/25 to-transparent blur-3xl contact-blob"
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <h1 className="font-display text-[26px] font-semibold text-slate-900 tracking-tight leading-[1.05]">
            Get in touch
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1.5">
            Visit the store, call, or message us on WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Left half: map + address */}
          <div className="flex flex-col rounded-2xl border border-slate-200 overflow-hidden bg-white/75 backdrop-blur-xl shadow-[0_20px_48px_-30px_rgba(217,70,239,0.35)]">
            <div className="flex-1 min-h-[320px]">
              <iframe
                title="Store location"
                src={CONTACT.mapEmbedSrc}
                width="100%"
                height="100%"
                style={{ border: 0, display: "block", minHeight: 320 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-5 border-t border-slate-200">
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-2">
                Store address
              </h4>
              <address className="not-italic text-[14px] text-slate-900 leading-relaxed">
                {CONTACT.address.line1}
                <br />
                {CONTACT.address.line2}
                <br />
                {CONTACT.address.line3}
              </address>
            </div>
          </div>

          {/* Right half: email, whatsapp, mobile numbers */}
          <div className="flex flex-col gap-5">
            <SectionCard icon={<MailIcon />} title="Email">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="font-mono text-[14px] text-slate-900 hover:text-fuchsia-600 transition-colors duration-150 break-all"
                >
                  {CONTACT.email}
                </a>
                <CopyButton value={CONTACT.email} />
              </div>
            </SectionCard>

            <SectionCard icon={<WhatsAppIcon className="w-5 h-5" />} title="WhatsApp">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-mono text-[14px] text-slate-900">{CONTACT.whatsapp}</span>
                <div className="flex items-center gap-3">
                  <CopyButton value={CONTACT.whatsapp} />
                  <ActionButton
                    href={`https://wa.me/${CONTACT.whatsappDial}`}
                    icon={<WhatsAppIcon />}
                    label="Message"
                    tone="brand"
                    external
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<PhoneIcon className="w-5 h-5" />} title="Call us">
              <div className="flex flex-col gap-4">
                {CONTACT.mobiles.map((m) => {
                  const digits = toDialDigits(m.number);
                  return (
                    <div
                      key={m.number}
                      className="flex items-center justify-between gap-3 flex-wrap pb-4 last:pb-0 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-0.5">
                          {m.label}
                        </p>
                        <span className="font-mono text-[14px] text-slate-900">{m.number}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CopyButton value={m.number} />
                        <ActionButton
                          href={`tel:${digits}`}
                          icon={<PhoneIcon />}
                          label="Call"
                        />
                        <ActionButton
                          href={`https://wa.me/${digits}`}
                          icon={<WhatsAppIcon />}
                          label="WhatsApp"
                          tone="brand"
                          external
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes contact-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-24px, 20px) scale(1.08); }
        }
        .contact-blob { animation: contact-drift 18s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .contact-blob { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Contact;