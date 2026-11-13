import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { registerFonts } from "@/lib/services/complete-export/pdf";
import { FORM, logoImage } from "@/lib/services/pdf-brand";
import type { ShopOrderWithItems } from "./db";

// The shop's tax invoice (attached to the receipt email, and downloadable
// from the order page and Admin → Shop orders). It's only a "Tax invoice"
// once the business ABN is set (SHOP_ABN); until then it's a "Receipt".

const BUSINESS_NAME = process.env.SHOP_BUSINESS_NAME || "The Adulting Life";
const ABN = process.env.SHOP_ABN?.trim() || null;
const BUSINESS_EMAIL = "hello@theadultinglife.com.au";

const money = (cents: number) => (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const date = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

const s = StyleSheet.create({
  page: { fontFamily: "Source Sans", fontSize: 10, color: FORM.ink, padding: 48 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  logo: { width: 150 },
  title: { fontFamily: "Poppins", fontSize: 20, textAlign: "right" },
  muted: { color: FORM.soft },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  label: { fontFamily: "Poppins", fontWeight: 600, fontSize: 9, marginBottom: 3, textTransform: "uppercase", color: FORM.soft },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderColor: FORM.ink,
    paddingBottom: 4,
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 9,
  },
  line: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: FORM.grid, paddingVertical: 6 },
  colItem: { flex: 1 },
  colQty: { width: 40, textAlign: "right" },
  colPrice: { width: 80, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { fontFamily: "Poppins", fontWeight: 600, fontSize: 12, borderTopWidth: 1.5, borderColor: FORM.ink, paddingTop: 5, marginTop: 3 },
  foot: { position: "absolute", bottom: 40, left: 48, right: 48, textAlign: "center", fontSize: 9, color: FORM.soft },
});

export async function renderInvoicePdf(order: ShopOrderWithItems): Promise<{ bytes: Buffer; filename: string }> {
  registerFonts();
  const title = ABN ? "Tax invoice" : "Receipt";
  const posted = order.items.some((i) => i.kind === "post") && order.ship_line1;
  const issued = order.paid_at ?? order.created_at;

  const bytes = await renderToBuffer(
    <Document title={`${title} #${order.order_number} — ${BUSINESS_NAME}`} author={BUSINESS_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={logoImage()} style={s.logo} />
          <View>
            <Text style={s.title}>{title}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>#{order.order_number}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View>
            <Text style={s.label}>From</Text>
            <Text>{BUSINESS_NAME}</Text>
            {ABN && <Text>ABN {ABN}</Text>}
            <Text style={s.muted}>{BUSINESS_EMAIL}</Text>
          </View>
          <View>
            <Text style={s.label}>To</Text>
            <Text>{order.name}</Text>
            <Text style={s.muted}>{order.email}</Text>
            {posted && (
              <>
                <Text>{order.ship_line1}</Text>
                {order.ship_line2 && <Text>{order.ship_line2}</Text>}
                <Text>
                  {order.ship_suburb} {order.ship_state} {order.ship_postcode}
                </Text>
              </>
            )}
          </View>
          <View>
            <Text style={s.label}>Date</Text>
            <Text>{date(issued)}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Payment</Text>
            <Text>{order.total_cents === 0 ? "No charge" : "Paid by card"}</Text>
          </View>
        </View>

        <View style={s.tableHead}>
          <Text style={s.colItem}>Item</Text>
          <Text style={s.colQty}>Qty</Text>
          <Text style={s.colPrice}>Price</Text>
          <Text style={s.colPrice}>Amount</Text>
        </View>
        {order.items.map((i) => (
          <View key={i.id} style={s.line} wrap={false}>
            <Text style={s.colItem}>{i.name}</Text>
            <Text style={s.colQty}>{i.quantity}</Text>
            <Text style={s.colPrice}>{money(i.unit_price_cents)}</Text>
            <Text style={s.colPrice}>{money(i.unit_price_cents * i.quantity)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          {order.items.some((i) => i.kind === "post") && (
            <View style={s.totalRow}>
              <Text>Postage</Text>
              <Text>Included</Text>
            </View>
          )}
          <View style={[s.totalRow, s.grand]}>
            <Text>Total (AUD)</Text>
            <Text>{money(order.total_cents)}</Text>
          </View>
          {order.total_cents > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Includes GST of</Text>
              <Text style={s.muted}>{money(order.gst_cents)}</Text>
            </View>
          )}
        </View>

        <Text style={s.foot}>Thank you for your order — {BUSINESS_NAME} · theadultinglife.com.au</Text>
      </Page>
    </Document>
  );
  return { bytes, filename: `${BUSINESS_NAME} ${title} ${order.order_number}.pdf` };
}
