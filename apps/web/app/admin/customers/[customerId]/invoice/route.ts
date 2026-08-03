import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "../../../../../lib/auth/session";
import { getCurrentInvoiceSnapshotForCustomer } from "../../../../../lib/data/local-db";

export const runtime = "nodejs";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const COLORS = {
  paper: "FFF6ED",
  pageGlow: "FFB768",
  card: "FFF9F1",
  cardAlt: "FBE6D1",
  line: "E8D6C3",
  ink: "2E2559",
  muted: "786985",
  accent: "FF7B45",
  accentDeep: "BB4D00",
  dangerBg: "FBE0D4",
  dangerText: "8E3200",
};

function formatEasternDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00.000Z`));
}

function formatEasternDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "customer";
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function wrapText(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    lines.push(current);
    current = words[index];
  }

  lines.push(current);
  return lines;
}

class StyledPdfBuilder {
  private pages: string[][] = [];
  private currentY = 0;

  constructor() {
    this.addPage();
  }

  private addPage() {
    const commands: string[] = [];
    commands.push(`q ${hexToRgb(COLORS.paper)} rg 0 0 612 792 re f Q`);
    commands.push(`q ${hexToRgb(COLORS.pageGlow)} rg 0.20 0.20 0.20 RG 0 0 612 792 re S Q`);
    this.pages.push(commands);
    this.currentY = 742;
  }

  private get page() {
    return this.pages[this.pages.length - 1];
  }

  ensureRoom(height: number) {
    if (this.currentY - height < 48) {
      this.addPage();
    }
  }

  addRect(x: number, y: number, width: number, height: number, fillHex: string, strokeHex?: string, lineWidth = 1) {
    const fill = hexToRgb(fillHex);
    const stroke = strokeHex ? hexToRgb(strokeHex) : fill;
    this.page.push(`q ${fill} rg ${stroke} RG ${lineWidth} w ${x} ${y} ${width} ${height} re B Q`);
  }

  addText(text: string, x: number, y: number, options?: { size?: number; color?: string }) {
    const size = options?.size ?? 12;
    const color = hexToRgb(options?.color ?? COLORS.ink);
    this.page.push(`BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
  }

  addWrappedText(text: string, x: number, y: number, width: number, options?: { size?: number; color?: string; leading?: number }) {
    const size = options?.size ?? 12;
    const leading = options?.leading ?? size + 4;
    const maxChars = Math.max(16, Math.floor(width / (size * 0.48)));
    const lines = wrapText(text, maxChars);

    lines.forEach((line, index) => {
      this.addText(line, x, y - (index * leading), { size, color: options?.color });
    });

    return lines.length * leading;
  }

  advanceTo(y: number) {
    this.currentY = y;
  }

  getCursorY() {
    return this.currentY;
  }

  setCursorY(y: number) {
    this.currentY = y;
  }

  consume(height: number, gap = 0) {
    this.currentY -= height + gap;
  }

  toBuffer() {
    const objects: string[] = [];
    const pushObject = (content: string) => {
      objects.push(content);
      return objects.length;
    };

    const fontId = pushObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds: number[] = [];
    const contentIds: number[] = [];

    for (const pageCommands of this.pages) {
      const content = pageCommands.join("\n");
      const contentId = pushObject(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
      contentIds.push(contentId);
      pageIds.push(0);
    }

    const pagesId = pushObject("");

    for (let index = 0; index < this.pages.length; index += 1) {
      const pageId = pushObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`);
      pageIds[index] = pageId;
    }

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    const catalogId = pushObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
  }
}

function drawSummaryCard(
  pdf: StyledPdfBuilder,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  tone: "normal" | "danger" = "normal",
) {
  const fill = tone === "danger" ? COLORS.dangerBg : COLORS.card;
  const valueColor = tone === "danger" ? COLORS.dangerText : COLORS.ink;
  pdf.addRect(x, y - 66, width, 66, fill, COLORS.line);
  pdf.addText(label.toUpperCase(), x + 14, y - 20, { size: 9, color: COLORS.muted });
  pdf.addText(value, x + 14, y - 46, { size: 16, color: valueColor });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  const currentUser = await getCurrentSessionUser();
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "master_admin") || currentUser.accountState === "banned") {
    return NextResponse.json({ message: "Admin access is required." }, { status: 403 });
  }

  const { customerId } = await context.params;
  const invoice = await getCurrentInvoiceSnapshotForCustomer(customerId);
  const pdf = new StyledPdfBuilder();

  pdf.addRect(38, 616, 536, 136, COLORS.card, COLORS.line);
  pdf.addText("Fatguydiscounts", 58, 718, { size: 22, color: COLORS.ink });
  pdf.addText("CURRENT CUSTOMER INVOICE", 58, 694, { size: 10, color: COLORS.accent });
  pdf.addWrappedText(`Prepared for ${invoice.customer.displayName}`, 58, 666, 300, {
    size: 24,
    color: COLORS.ink,
    leading: 26,
  });
  pdf.addText(`Generated ${formatEasternDateTime(invoice.generatedOn)}`, 58, 628, {
    size: 11,
    color: COLORS.muted,
  });

  pdf.addRect(388, 634, 166, 94, COLORS.cardAlt, COLORS.line);
  pdf.addText("Customer info".toUpperCase(), 404, 705, { size: 9, color: COLORS.accent });
  pdf.addWrappedText(invoice.customer.displayName, 404, 682, 132, { size: 15, color: COLORS.ink, leading: 18 });
  pdf.addWrappedText(invoice.customer.email || "No email on file", 404, 660, 132, { size: 10, color: COLORS.muted, leading: 12 });
  pdf.addWrappedText(invoice.customer.address, 404, 634, 132, { size: 10, color: COLORS.muted, leading: 12 });

  const summaryTop = 590;
  drawSummaryCard(pdf, 38, summaryTop, 124, "Total due", currency.format(invoice.openBalance.totalAmount));
  drawSummaryCard(pdf, 174, summaryTop, 124, "Past due", currency.format(invoice.openBalance.overdueAmount), invoice.openBalance.overdueAmount > 0 ? "danger" : "normal");
  drawSummaryCard(pdf, 310, summaryTop, 124, "Current due", currency.format(invoice.openBalance.currentAmount));
  drawSummaryCard(pdf, 446, summaryTop, 128, "Shipping", currency.format(invoice.openBalance.shippingAmount));

  pdf.advanceTo(498);

  if (invoice.cycles.length === 0) {
    pdf.ensureRoom(96);
    pdf.addRect(38, pdf.getCursorY() - 86, 536, 86, COLORS.card, COLORS.line);
    pdf.addText("No open invoice items are on the account right now.", 58, pdf.getCursorY() - 42, {
      size: 14,
      color: COLORS.ink,
    });
    pdf.consume(96);
  } else {
    for (const cycle of invoice.cycles) {
      const itemRows = Math.max(cycle.items.length, 1);
      const estimatedHeight = 118 + (itemRows * 22) + 72;
      pdf.ensureRoom(estimatedHeight);

      const cardTop = pdf.getCursorY();
      const cardHeight = estimatedHeight;
      const cardBottom = cardTop - cardHeight;
      pdf.addRect(38, cardBottom, 536, cardHeight, COLORS.card, COLORS.line);

      pdf.addText(cycle.overdue ? "PAST DUE CYCLE" : "CURRENT CYCLE", 58, cardTop - 24, {
        size: 10,
        color: cycle.overdue ? COLORS.dangerText : COLORS.accent,
      });
      pdf.addText(`Due ${formatEasternDate(cycle.dueDate)}`, 58, cardTop - 48, {
        size: 20,
        color: COLORS.ink,
      });
      pdf.addText(`Amount due ${currency.format(cycle.amountDue)}`, 420, cardTop - 48, {
        size: 14,
        color: cycle.overdue ? COLORS.dangerText : COLORS.accentDeep,
      });

      let rowY = cardTop - 82;
      if (cycle.items.length === 0) {
        pdf.addText("No line items are attached to this open cycle.", 58, rowY, {
          size: 11,
          color: COLORS.muted,
        });
        rowY -= 22;
      } else {
        for (const item of cycle.items) {
          const leftText = `${item.description}  |  Qty ${item.quantity}  |  ${currency.format(item.unitPrice)} each`;
          pdf.addWrappedText(leftText, 58, rowY, 360, {
            size: 11,
            color: COLORS.ink,
            leading: 13,
          });
          pdf.addText(currency.format(item.total), 470, rowY, {
            size: 11,
            color: COLORS.ink,
          });
          rowY -= 22;
        }
      }

      pdf.addText(`Subtotal ${currency.format(cycle.subtotal)}`, 58, rowY - 10, { size: 11, color: COLORS.muted });
      pdf.addText(`Shipping ${currency.format(cycle.shipping)}`, 184, rowY - 10, { size: 11, color: COLORS.muted });
      pdf.addText(`Adjustments ${currency.format(cycle.adjustments)}`, 304, rowY - 10, { size: 11, color: COLORS.muted });
      pdf.addText(`Payments ${currency.format(cycle.paymentsApplied)}`, 430, rowY - 10, { size: 11, color: COLORS.muted });
      pdf.addText(`Credits ${currency.format(cycle.creditsApplied)}`, 58, rowY - 32, { size: 11, color: COLORS.muted });
      pdf.addText(`Cycle due ${currency.format(cycle.amountDue)}`, 430, rowY - 32, {
        size: 12,
        color: cycle.overdue ? COLORS.dangerText : COLORS.accentDeep,
      });

      pdf.setCursorY(cardBottom - 18);
    }
  }

  pdf.ensureRoom(54);
  pdf.addText("Claim-first deals for repeat shoppers", 38, 26, {
    size: 10,
    color: COLORS.muted,
  });

  const filename = `${sanitizeFilenamePart(invoice.customer.displayName)}-current-invoice.pdf`;

  return new NextResponse(pdf.toBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
