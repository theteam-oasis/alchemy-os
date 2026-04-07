"use client";

import { useState, useMemo, useEffect } from "react";
import { jsPDF } from "jspdf";
import {
  Download,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
} from "lucide-react";

// ─── Design Tokens ───

const C = {
  bg: "#FFFFFF",
  bgSoft: "#F5F5F7",
  bgHover: "#F0F0F2",
  border: "#D2D2D7",
  borderLight: "#E8E8ED",
  text: "#1D1D1F",
  textSec: "#86868B",
  textTer: "#AEAEB2",
  card: "#FFFFFF",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  accent: "#000000",
  accentSoft: "#00000008",
  success: "#34C759",
  danger: "#FF3B30",
};

const hd = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

// ─── Reusable Components ───

function Input({ label, value, onChange, placeholder, textarea, half, type = "text" }) {
  return (
    <div style={{ flex: half ? "1 1 48%" : "1 1 100%", minWidth: half ? 180 : 0 }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 6, letterSpacing: "0.02em" }}>
          {label}
        </label>
      )}
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", fontSize: 14, border: `1px solid ${C.borderLight}`,
            borderRadius: 8, background: C.bg, color: C.text, resize: "vertical", outline: "none",
            fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "10px 12px", fontSize: 14, border: `1px solid ${C.borderLight}`,
            borderRadius: 8, background: C.bg, color: C.text, outline: "none",
            fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}

function Btn({ children, onClick, primary, small, danger, icon: Icon, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: small ? "6px 14px" : "10px 20px",
        fontSize: small ? 13 : 14, fontWeight: 500,
        background: danger ? C.danger : primary ? C.accent : C.bg,
        color: danger ? "#fff" : primary ? "#fff" : C.text,
        border: primary || danger ? "none" : `1px solid ${C.border}`,
        borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Inter', sans-serif",
        transition: "background 0.15s",
      }}
    >
      {Icon && <Icon size={small ? 14 : 16} />}
      {children}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 12,
      padding: 24, boxShadow: C.cardShadow,
    }}>
      <h3 style={{ ...hd, fontSize: 20, color: C.text, margin: "0 0 16px 0" }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── Helpers ───

function generateInvoiceNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = String(Math.floor(Math.random() * 9000) + 1000);
  return `INV-${y}${m}-${r}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatCurrency(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDatePretty(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── PDF Generator ───

function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pw - margin * 2;
  let y = 50;

  const checkPage = (needed = 40) => {
    if (y + needed > ph - 60) { doc.addPage(); y = 50; }
  };

  // ── Header ──
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 29, 31);
  doc.text("INVOICE", margin, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(134, 134, 139);
  doc.text(invoice.invoiceNumber, pw - margin, y - 10, { align: "right" });
  y += 8;
  doc.setFontSize(10);
  doc.text(`Date: ${formatDatePretty(invoice.date)}`, pw - margin, y + 4, { align: "right" });
  y += 14;
  doc.text(`Due: ${formatDatePretty(invoice.dueDate)}`, pw - margin, y + 4, { align: "right" });
  y += 6;

  // Divider
  doc.setDrawColor(210, 210, 215);
  doc.line(margin, y + 10, pw - margin, y + 10);
  y += 28;

  // ── From / To ──
  const colW = contentW / 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(134, 134, 139);
  doc.text("FROM", margin, y);
  doc.text("BILL TO", margin + colW + 20, y);
  y += 16;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 29, 31);
  doc.text(invoice.fromName || "", margin, y);
  doc.text(invoice.toName || "", margin + colW + 20, y);
  y += 16;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 85);

  const fromLines = [invoice.fromAddress, invoice.fromEmail, invoice.fromPhone].filter(Boolean);
  const toLines = [invoice.toCompany, invoice.toAddress, invoice.toEmail].filter(Boolean);
  const maxLines = Math.max(fromLines.length, toLines.length);

  for (let i = 0; i < maxLines; i++) {
    if (fromLines[i]) doc.text(fromLines[i], margin, y);
    if (toLines[i]) doc.text(toLines[i], margin + colW + 20, y);
    y += 14;
  }
  y += 16;

  // ── Line Items Table ──
  // Table header
  const colDesc = margin;
  const colQty = margin + contentW - 200;
  const colRate = margin + contentW - 130;
  const colAmt = pw - margin;

  doc.setFillColor(245, 245, 247);
  doc.roundedRect(margin, y - 4, contentW, 24, 4, 4, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(134, 134, 139);
  doc.text("DESCRIPTION", colDesc + 10, y + 12);
  doc.text("QTY", colQty, y + 12, { align: "right" });
  doc.text("RATE", colRate + 40, y + 12, { align: "right" });
  doc.text("AMOUNT", colAmt - 10, y + 12, { align: "right" });
  y += 32;

  // Table rows
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(29, 29, 31);

  invoice.items.forEach((item) => {
    checkPage(24);
    const desc = item.description || "";
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amt = qty * rate;

    doc.text(desc, colDesc + 10, y);
    doc.text(String(qty), colQty, y, { align: "right" });
    doc.text(formatCurrency(rate), colRate + 40, y, { align: "right" });
    doc.text(formatCurrency(amt), colAmt - 10, y, { align: "right" });
    y += 20;

    // Light divider between rows
    doc.setDrawColor(232, 232, 237);
    doc.line(margin, y - 6, pw - margin, y - 6);
  });

  y += 16;

  // ── Totals ──
  checkPage(100);
  const totalsX = margin + contentW - 200;
  const totalsValX = pw - margin - 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 85);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(29, 29, 31);
  doc.text(formatCurrency(invoice.subtotal), totalsValX, y, { align: "right" });
  y += 18;

  if (invoice.taxRate > 0) {
    doc.setTextColor(80, 80, 85);
    doc.text(`Tax (${invoice.taxRate}%)`, totalsX, y);
    doc.setTextColor(29, 29, 31);
    doc.text(formatCurrency(invoice.taxAmount), totalsValX, y, { align: "right" });
    y += 18;
  }

  if (invoice.discount > 0) {
    doc.setTextColor(80, 80, 85);
    doc.text("Discount", totalsX, y);
    doc.setTextColor(52, 199, 89);
    doc.text(`-${formatCurrency(invoice.discount)}`, totalsValX, y, { align: "right" });
    y += 18;
  }

  // Total line
  doc.setDrawColor(29, 29, 31);
  doc.line(totalsX, y, pw - margin, y);
  y += 18;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 29, 31);
  doc.text("Total Due", totalsX, y);
  doc.text(formatCurrency(invoice.total), totalsValX, y, { align: "right" });
  y += 30;

  // ── Notes ──
  if (invoice.notes) {
    checkPage(60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(134, 134, 139);
    doc.text("NOTES", margin, y);
    y += 14;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 85);
    const noteLines = doc.splitTextToSize(invoice.notes, contentW);
    noteLines.forEach((line) => {
      checkPage(14);
      doc.text(line, margin, y);
      y += 14;
    });
  }

  // ── Footer ──
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(174, 174, 178);
  doc.text("Generated by ALCHEMY Studios", pw / 2, ph - 30, { align: "center" });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

// ─── Main Component ───

export default function InvoicePage() {
  const [fromName, setFromName] = useState("ALCHEMY Studios");
  const [fromAddress, setFromAddress] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromPhone, setFromPhone] = useState("");

  const [toName, setToName] = useState("");
  const [toCompany, setToCompany] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toEmail, setToEmail] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    setInvoiceNumber(generateInvoiceNumber());
    setDate(today());
    setDueDate(addDays(today(), 30));
  }, []);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  const [items, setItems] = useState([{ description: "", quantity: "1", rate: "" }]);
  const [taxRate, setTaxRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("Payment is due within 30 days of the invoice date. Thank you for your business.");

  // ── Calculations ──
  const { subtotal, taxAmount, total } = useMemo(() => {
    const sub = items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    }, 0);
    const tax = sub * ((parseFloat(taxRate) || 0) / 100);
    const disc = parseFloat(discount) || 0;
    return { subtotal: sub, taxAmount: tax, total: Math.max(0, sub + tax - disc) };
  }, [items, taxRate, discount]);

  // ── Line Item Handlers ──
  const updateItem = (i, field, value) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  };

  const addItem = () => setItems([...items, { description: "", quantity: "1", rate: "" }]);

  const removeItem = (i) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  };

  // ── Export ──
  const handleExport = () => {
    generateInvoicePDF({
      invoiceNumber, date, dueDate,
      fromName, fromAddress, fromEmail, fromPhone,
      toName, toCompany, toAddress, toEmail,
      items, subtotal, taxRate: parseFloat(taxRate) || 0, taxAmount,
      discount: parseFloat(discount) || 0, total, notes,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top Bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10, background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.borderLight}`,
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/dashboard" style={{ color: C.textSec, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={16} /> Dashboard
          </a>
          <span style={{ color: C.borderLight }}>|</span>
          <FileText size={18} color={C.text} />
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{invoiceNumber}</span>
        </div>
        <Btn primary icon={Download} onClick={handleExport}>
          Download PDF
        </Btn>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ ...hd, fontSize: 36, color: C.text, margin: 0 }}>Invoice Generator</h1>
          <p style={{ fontSize: 14, color: C.textSec, margin: "6px 0 0" }}>
            Fill in the details below and download a professional PDF invoice.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* From / To */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Section title="From">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Input label="Name / Company" value={fromName} onChange={setFromName} placeholder="Your company name" />
                <Input label="Address" value={fromAddress} onChange={setFromAddress} placeholder="123 Main St, City, State" />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Input label="Email" value={fromEmail} onChange={setFromEmail} placeholder="you@company.com" half type="email" />
                  <Input label="Phone" value={fromPhone} onChange={setFromPhone} placeholder="(555) 000-0000" half />
                </div>
              </div>
            </Section>

            <Section title="Bill To">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Input label="Client Name" value={toName} onChange={setToName} placeholder="Client name" />
                <Input label="Company" value={toCompany} onChange={setToCompany} placeholder="Client company" />
                <Input label="Address" value={toAddress} onChange={setToAddress} placeholder="456 Oak Ave, City, State" />
                <Input label="Email" value={toEmail} onChange={setToEmail} placeholder="client@company.com" type="email" />
              </div>
            </Section>
          </div>

          {/* Invoice Details */}
          <Section title="Invoice Details">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Input label="Invoice #" value={invoiceNumber} onChange={() => {}} half />
              <Input label="Date" value={date} onChange={setDate} half type="date" />
              <Input label="Due Date" value={dueDate} onChange={setDueDate} half type="date" />
              <Input label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms} half placeholder="Net 30" />
            </div>
          </Section>

          {/* Line Items */}
          <Section title="Line Items">
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {/* Header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 80px 100px 100px 36px",
                gap: 12, padding: "0 0 8px", borderBottom: `1px solid ${C.borderLight}`,
              }}>
                {["Description", "Qty", "Rate ($)", "Amount", ""].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.textSec, letterSpacing: "0.03em" }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {items.map((item, i) => {
                const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 100px 100px 36px",
                    gap: 12, alignItems: "center", padding: "10px 0",
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}>
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      placeholder="Service description"
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 14, border: `1px solid ${C.borderLight}`,
                        borderRadius: 6, background: C.bg, color: C.text, outline: "none",
                        fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                      }}
                    />
                    <input
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      type="number" min="0" step="1"
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 14, border: `1px solid ${C.borderLight}`,
                        borderRadius: 6, background: C.bg, color: C.text, outline: "none", textAlign: "center",
                        fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                      }}
                    />
                    <input
                      value={item.rate}
                      onChange={(e) => updateItem(i, "rate", e.target.value)}
                      placeholder="0.00" type="number" min="0" step="0.01"
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 14, border: `1px solid ${C.borderLight}`,
                        borderRadius: 6, background: C.bg, color: C.text, outline: "none", textAlign: "right",
                        fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text, textAlign: "right", paddingRight: 4 }}>
                      {formatCurrency(amt)}
                    </span>
                    <button
                      onClick={() => removeItem(i)}
                      style={{
                        background: "none", border: "none", cursor: items.length === 1 ? "not-allowed" : "pointer",
                        color: items.length === 1 ? C.textTer : C.danger, padding: 4, borderRadius: 4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <Btn small icon={Plus} onClick={addItem}>Add Item</Btn>
            </div>

            {/* Summary */}
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderLight}`,
              display: "flex", justifyContent: "flex-end",
            }}>
              <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.textSec }}>
                  <span>Subtotal</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: C.textSec }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Tax</span>
                    <input
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      type="number" min="0" step="0.5"
                      style={{
                        width: 52, padding: "4px 6px", fontSize: 13, border: `1px solid ${C.borderLight}`,
                        borderRadius: 4, textAlign: "center", outline: "none", fontFamily: "'Inter', sans-serif",
                      }}
                    />
                    <span>%</span>
                  </div>
                  <span style={{ color: C.text, fontWeight: 500 }}>{formatCurrency(taxAmount)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: C.textSec }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Discount</span>
                    <span style={{ fontSize: 12, color: C.textTer }}>$</span>
                    <input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      type="number" min="0" step="0.01"
                      style={{
                        width: 72, padding: "4px 6px", fontSize: 13, border: `1px solid ${C.borderLight}`,
                        borderRadius: 4, textAlign: "right", outline: "none", fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </div>
                  <span style={{ color: C.success, fontWeight: 500 }}>
                    {parseFloat(discount) > 0 ? `-${formatCurrency(parseFloat(discount) || 0)}` : formatCurrency(0)}
                  </span>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600,
                  color: C.text, paddingTop: 10, borderTop: `2px solid ${C.text}`,
                }}>
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notes / Terms">
            <Input
              value={notes}
              onChange={setNotes}
              textarea
              placeholder="Payment terms, bank details, or any additional notes..."
            />
          </Section>

          {/* Export Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
            <Btn primary icon={Download} onClick={handleExport}>
              Download Invoice PDF
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
