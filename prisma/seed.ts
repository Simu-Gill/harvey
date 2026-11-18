// Seed: realistic demo portfolio for the lending business.
// Run with: bun prisma/seed.ts
//
// Every loan below mirrors a real lending pattern:
//   • on-schedule payers (instalment every month)
//   • interest-only payers (principal left untouched)
//   • irregular payers, late settlers, and stale overdue accounts
// Payment interest/principal splits are computed with the SAME
// allocation engine the live API uses (src/lib/loan-math.ts).

import { PrismaClient } from "@prisma/client";
import { subMonths, subDays, getDaysInMonth, set } from "date-fns";
import {
  totalDueOf,
  installmentOf,
  monthlyInterestOf,
  allocatePayment,
  round2,
} from "../src/lib/loan-math";

const db = new PrismaClient();

const now = new Date();

/** Date `m` months ago on `day` of that month; rolled back if in the future. */
function mAgo(m: number, day: number): Date {
  let d = subMonths(now, m);
  d = set(d, { date: Math.min(day, getDaysInMonth(d)) });
  while (d.getTime() > now.getTime() - 86400000) d = subMonths(d, 1);
  return d;
}
function dAgo(days: number): Date {
  return subDays(now, days);
}

interface PaySpec {
  at: Date;
  amount: number;
  method?: string;
  note?: string;
}

interface LoanSpec {
  client: string; // client name key
  principal: number;
  rate: number;
  unit: "monthly" | "term";
  term: number;
  started: Date;
  notes?: string;
  payments: PaySpec[];
}

/** On-schedule monthly payments (with small human jitter), last one trues up. */
function onTime(
  startedMonthsAgo: number,
  count: number,
  principal: number,
  rate: number,
  term: number,
  method = "cash",
  startDay = 6
): PaySpec[] {
  const core = {
    principal,
    interestRate: rate,
    rateUnit: "monthly" as const,
    termMonths: term,
    startDate: mAgo(startedMonthsAgo, startDay),
  };
  const inst = installmentOf(core);
  const out: PaySpec[] = [];
  let paid = 0;
  for (let i = 0; i < count; i++) {
    const monthsAfterStart = i + 1;
    const monthsAgo = startedMonthsAgo - monthsAfterStart;
    const day = 10 + ((i * 3) % 9); // 10..18
    const at = monthsAgo >= 0 ? mAgo(monthsAgo, day) : dAgo(4 + i);
    let amount = inst;
    if (i === count - 1 && count >= term) {
      amount = round2(totalDueOf(core) - paid); // final true-up on maturity
    } else if (i % 3 === 1) amount = round2(inst - 33);
    else if (i % 3 === 2) amount = round2(inst + 33);
    paid = round2(paid + amount);
    out.push({ at, amount, method });
  }
  return out;
}

/** Interest-only payments (principal untouched). */
function interestOnly(
  startedMonthsAgo: number,
  count: number,
  principal: number,
  rate: number,
  term: number,
  method = "cash",
  startDay = 6
): PaySpec[] {
  const core = {
    principal,
    interestRate: rate,
    rateUnit: "monthly" as const,
    termMonths: term,
    startDate: mAgo(startedMonthsAgo, startDay),
  };
  const mi = monthlyInterestOf(core);
  const out: PaySpec[] = [];
  for (let i = 0; i < count; i++) {
    const monthsAgo = startedMonthsAgo - (i + 1);
    const day = 8 + ((i * 5) % 12);
    const at = monthsAgo >= 0 ? mAgo(monthsAgo, day) : dAgo(5 + i * 2);
    out.push({ at, amount: mi, method });
  }
  return out;
}

const clients = [
  {
    name: "Samuel Osei",
    phone: "+1 (555) 014-2233",
    email: "samuel.osei@example.com",
    address: "12 Kakramadu Lane, East Ridge",
    idNumber: "ID-3321-4455",
    occupation: "Market trader",
    notes: "Long-standing client since 2019. Reliable payer.",
  },
  {
    name: "Grace Mensah",
    phone: "+1 (555) 096-7781",
    email: "grace.mensah@example.com",
    address: "4 Hillbrow Drive, Cantonments",
    idNumber: "ID-8890-1123",
    occupation: "Teacher",
    notes: "Salaried. Prefers bank transfer.",
  },
  {
    name: "Daniel Boateng",
    phone: "+1 (555) 023-5540",
    address: "78 Station Road, Asylum Down",
    idNumber: "ID-5567-9021",
    occupation: "Transport operator",
    notes: "Owns two taxis. Income is seasonal.",
  },
  {
    name: "Akosua Frimpong",
    phone: "+1 (555) 061-2245",
    address: "Stall 41, Central Market",
    idNumber: "ID-1122-3344",
    occupation: "Market trader",
    notes: "Interest-only arrangement; principal due at maturity.",
  },
  {
    name: "Michael Owusu",
    phone: "+1 (555) 077-8890",
    address: "9 Workshop Enclave, Spintex",
    idNumber: "ID-7788-2210",
    occupation: "Auto mechanic",
    notes: "Referred by Samuel Osei.",
  },
  {
    name: "Nana Ama Danso",
    phone: "+1 (555) 045-1129",
    email: "nana.danso@example.com",
    address: "31 Boutique Row, Osu",
    idNumber: "ID-2233-6677",
    occupation: "Boutique owner",
  },
  {
    name: "Kwame Asante",
    phone: "+1 (555) 032-8867",
    address: "17 Volta Street, Adabraka",
    idNumber: "ID-4455-8899",
    occupation: "Electrician",
    notes: "Small balance left — chasing since maturity.",
  },
  {
    name: "Yaa Nkrumah",
    phone: "+1 (555) 018-9902",
    email: "yaa.catering@example.com",
    address: "5 Palm Lane, Dzorwulu",
    idNumber: "ID-6677-1100",
    occupation: "Caterer",
  },
  {
    name: "Josephine Ade",
    phone: "+1 (555) 054-3311",
    address: "22 Salon Plaza, Labone",
    idNumber: "ID-9900-1234",
    occupation: "Salon owner",
    notes: "Repeat borrower — third loan with us.",
  },
  {
    name: "Emmanuel Tetteh",
    phone: "+1 (555) 088-4567",
    email: "e.tetteh@example.com",
    address: "Plot 7, Site Works, Tema",
    idNumber: "ID-3344-7788",
    occupation: "Building contractor",
    notes: "Largest exposure — review quarterly.",
  },
  {
    name: "Linda Agyei",
    phone: "+1 (555) 069-2244",
    email: "linda.agyei@example.com",
    address: "Staff Quarters, Ridge Hospital",
    idNumber: "ID-5566-3311",
    occupation: "Nurse",
    notes: "Pays by mobile money.",
  },
  {
    name: "Patrick Mensimah",
    phone: "+1 (555) 011-7788",
    address: "14 Clearing Yard Road, Tema Harbour",
    idNumber: "ID-7788-9900",
    occupation: "Import trader",
    notes: "New client — first disbursement this month.",
  },
  {
    name: "Rita Owusuaa",
    phone: "+1 (555) 027-6633",
    address: "59 Textile Street, Makola",
    idNumber: "ID-8899-4455",
    occupation: "Textiles retailer",
  },
  {
    name: "Comfort Boakye",
    phone: "+1 (555) 083-2210",
    address: "Farm Gate, Dodowa Road",
    idNumber: "ID-1100-5566",
    occupation: "Poultry farmer",
    notes: "Pays interest monthly from farm sales; principal at maturity.",
  },
];

const loans: LoanSpec[] = [
  // ── Samuel Osei ── completed loan, then an active one ──
  {
    client: "Samuel Osei",
    principal: 5000, rate: 10, unit: "monthly", term: 6,
    started: mAgo(15, 5),
    notes: "Stock expansion — Kantamanto shop.",
    payments: onTime(15, 6, 5000, 10, 6, "cash", 5),
  },
  {
    client: "Samuel Osei",
    principal: 6000, rate: 10, unit: "monthly", term: 6,
    started: mAgo(4, 7),
    notes: "Second container of goods.",
    payments: onTime(4, 4, 6000, 10, 6, "cash", 7),
  },
  // ── Grace Mensah ── completed, then fresh active loan ──
  {
    client: "Grace Mensah",
    principal: 2500, rate: 8, unit: "monthly", term: 3,
    started: mAgo(10, 12),
    notes: "School fees & laptop.",
    payments: [
      { at: mAgo(9, 14), amount: 1050, method: "bank_transfer" },
      { at: mAgo(8, 11), amount: 1050, method: "bank_transfer" },
      { at: mAgo(7, 16), amount: 1000, method: "bank_transfer" },
    ],
  },
  {
    client: "Grace Mensah",
    principal: 3500, rate: 10, unit: "monthly", term: 3,
    started: mAgo(1, 9),
    notes: "Family funeral contribution.",
    payments: [{ at: dAgo(6), amount: 1517, method: "bank_transfer" }],
  },
  // ── Daniel Boateng ── settled late, then new loan ──
  {
    client: "Daniel Boateng",
    principal: 8000, rate: 10, unit: "monthly", term: 4,
    started: mAgo(13, 20),
    notes: "Engine overhaul, taxi 2.",
    payments: [
      { at: mAgo(12, 22), amount: 2800, method: "cash" },
      { at: mAgo(11, 25), amount: 2000, method: "cash" },
      { at: mAgo(10, 18), amount: 1200, method: "cash", note: "Partial — slow season" },
      { at: mAgo(9, 20), amount: 1500, method: "cash" },
      { at: mAgo(8, 15), amount: 1600, method: "cash" },
      { at: mAgo(7, 12), amount: 1500, method: "cash" },
      { at: mAgo(6, 9), amount: 600, method: "cash", note: "Final settlement" },
    ],
  },
  {
    client: "Daniel Boateng",
    principal: 5000, rate: 10, unit: "monthly", term: 4,
    started: mAgo(1, 14),
    notes: "Tyres & insurance.",
    payments: [{ at: dAgo(9), amount: 1750, method: "cash" }],
  },
  // ── Akosua Frimpong ── interest-only payer (behind schedule) ──
  {
    client: "Akosua Frimpong",
    principal: 3000, rate: 10, unit: "monthly", term: 12,
    started: mAgo(7, 10),
    notes: "Interest-only; principal lump sum at maturity.",
    payments: interestOnly(7, 7, 3000, 10, 12, "cash", 10),
  },
  // ── Michael Owusu ── overdue ──
  {
    client: "Michael Owusu",
    principal: 4000, rate: 10, unit: "monthly", term: 3,
    started: mAgo(5, 8),
    notes: "Spray-gun and compressor.",
    payments: [
      { at: mAgo(4, 12), amount: 1300, method: "cash" },
      { at: mAgo(3, 14), amount: 1300, method: "cash" },
      { at: mAgo(2, 10), amount: 300, method: "cash", note: "Interest only" },
      { at: mAgo(1, 18), amount: 500, method: "mobile_money" },
      { at: dAgo(3), amount: 400, method: "mobile_money" },
    ],
  },
  // ── Nana Ama Danso ── completed on time ──
  {
    client: "Nana Ama Danso",
    principal: 10000, rate: 5, unit: "monthly", term: 6,
    started: mAgo(8, 4),
    notes: "Pre-Christmas stock purchase.",
    payments: onTime(8, 6, 10000, 5, 6, "bank_transfer", 4),
  },
  // ── Kwame Asante ── small stale overdue ──
  {
    client: "Kwame Asante",
    principal: 1500, rate: 10, unit: "monthly", term: 3,
    started: mAgo(9, 15),
    notes: "Tools replacement.",
    payments: [
      { at: mAgo(8, 17), amount: 650, method: "cash" },
      { at: mAgo(7, 14), amount: 650, method: "cash" },
      { at: mAgo(6, 20), amount: 300, method: "cash", note: "Interest" },
      { at: dAgo(26), amount: 200, method: "cash", note: "Part payment — promised rest" },
    ],
  },
  // ── Yaa Nkrumah ── active, slightly ahead ──
  {
    client: "Yaa Nkrumah",
    principal: 7500, rate: 10, unit: "monthly", term: 8,
    started: mAgo(6, 11),
    notes: "Catering equipment — events season.",
    payments: [
      { at: mAgo(5, 13), amount: 2000, method: "cash" },
      { at: mAgo(4, 12), amount: 2000, method: "bank_transfer" },
      { at: mAgo(3, 15), amount: 2000, method: "cash" },
      { at: mAgo(2, 11), amount: 2000, method: "cash" },
      { at: mAgo(1, 16), amount: 2000, method: "mobile_money" },
    ],
  },
  // ── Josephine Ade ── completed then repeat loan ──
  {
    client: "Josephine Ade",
    principal: 5000, rate: 10, unit: "monthly", term: 4,
    started: mAgo(11, 6),
    notes: "Dryers and styling chairs.",
    payments: onTime(11, 4, 5000, 10, 4, "cash", 6),
  },
  {
    client: "Josephine Ade",
    principal: 5000, rate: 10, unit: "monthly", term: 4,
    started: mAgo(2, 9),
    notes: "Second branch fit-out.",
    payments: [
      { at: mAgo(1, 12), amount: 1750, method: "cash" },
      { at: dAgo(7), amount: 1750, method: "cash" },
    ],
  },
  // ── Emmanuel Tetteh ── large loan, completed ──
  {
    client: "Emmanuel Tetteh",
    principal: 20000, rate: 8, unit: "monthly", term: 6,
    started: mAgo(12, 18),
    notes: "Working capital — school block project.",
    payments: [
      { at: mAgo(11, 20), amount: 5000, method: "bank_transfer" },
      { at: mAgo(10, 18), amount: 4800, method: "bank_transfer" },
      { at: mAgo(9, 21), amount: 4933, method: "bank_transfer" },
      { at: mAgo(8, 19), amount: 4900, method: "bank_transfer" },
      { at: mAgo(7, 20), amount: 4933, method: "bank_transfer" },
      { at: mAgo(6, 17), amount: 5034, method: "bank_transfer", note: "Final settlement" },
    ],
  },
  // ── Linda Agyei ── behind schedule ──
  {
    client: "Linda Agyei",
    principal: 2000, rate: 10, unit: "monthly", term: 3,
    started: mAgo(3, 5),
    notes: "Rent advance.",
    payments: [
      { at: mAgo(2, 9), amount: 867, method: "mobile_money" },
      { at: mAgo(1, 21), amount: 400, method: "mobile_money", note: "Short month" },
      { at: dAgo(4), amount: 300, method: "mobile_money", note: "Interest" },
    ],
  },
  // ── Patrick Mensimah ── brand new disbursement ──
  {
    client: "Patrick Mensimah",
    principal: 12000, rate: 10, unit: "monthly", term: 3,
    started: dAgo(6),
    notes: "Container clearing — goods arriving next week.",
    payments: [],
  },
  // ── Rita Owusuaa ── completed then active ahead of schedule ──
  {
    client: "Rita Owusuaa",
    principal: 6000, rate: 10, unit: "monthly", term: 6,
    started: mAgo(14, 8),
    notes: "Wedding-season stock.",
    payments: onTime(14, 6, 6000, 10, 6, "cash", 8),
  },
  {
    client: "Rita Owusuaa",
    principal: 3000, rate: 10, unit: "monthly", term: 6,
    started: mAgo(5, 22),
    notes: "Second stall at Makola.",
    payments: [
      { at: mAgo(4, 24), amount: 800, method: "cash" },
      { at: mAgo(3, 22), amount: 800, method: "cash" },
      { at: mAgo(2, 26), amount: 900, method: "cash" },
      { at: mAgo(1, 23), amount: 800, method: "cash" },
      { at: dAgo(8), amount: 800, method: "cash" },
    ],
  },
  // ── Comfort Boakye ── large interest-only arrangement (behind) ──
  {
    client: "Comfort Boakye",
    principal: 15000, rate: 5, unit: "monthly", term: 12,
    started: mAgo(9, 12),
    notes: "Feed & incubators. Interest monthly; principal at maturity.",
    payments: interestOnly(9, 9, 15000, 5, 12, "cash", 12),
  },
];

async function main() {
  console.log("Seeding lending portfolio…");

  await db.payment.deleteMany();
  await db.loan.deleteMany();
  await db.client.deleteMany();
  await db.setting.deleteMany();

  const clientIds = new Map<string, string>();
  for (const c of clients) {
    const created = await db.client.create({
      data: { ...c, createdAt: subMonths(now, 18) },
    });
    clientIds.set(c.name, created.id);
  }

  // reference numbers by calendar year of disbursement
  const sorted = [...loans].sort((a, b) => a.started.getTime() - b.started.getTime());
  const yearCount = new Map<number, number>();

  for (const spec of sorted) {
    const year = spec.started.getFullYear();
    const seq = (yearCount.get(year) ?? 0) + 1;
    yearCount.set(year, seq);
    const reference = `LN-${year}-${String(seq).padStart(4, "0")}`;

    const loan = await db.loan.create({
      data: {
        reference,
        clientId: clientIds.get(spec.client)!,
        principal: spec.principal,
        interestRate: spec.rate,
        rateUnit: spec.unit,
        termMonths: spec.term,
        startDate: spec.started,
        notes: spec.notes,
      },
    });

    const core = {
      principal: spec.principal,
      interestRate: spec.rate,
      rateUnit: spec.unit,
      termMonths: spec.term,
      startDate: spec.started,
    };

    const prior: { interestPart: number; principalPart: number }[] = [];
    const ordered = [...spec.payments].sort((a, b) => a.at.getTime() - b.at.getTime());
    const staff = ["Margaret", "Grace", "Susan"];
    let payIdx = 0;
    for (const p of ordered) {
      const alloc = allocatePayment(core, prior, p.amount, p.at);
      if (p.amount > alloc.balanceBefore + 0.01) {
        throw new Error(
          `${reference}: payment ${p.amount} exceeds balance ${alloc.balanceBefore}`
        );
      }
      await db.payment.create({
        data: {
          loanId: loan.id,
          amount: p.amount,
          interestPart: alloc.interestPart,
          principalPart: alloc.principalPart,
          date: p.at,
          method: p.method ?? "cash",
          note: p.note,
          recordedBy: staff[payIdx++ % staff.length],
        },
      });
      prior.push({
        interestPart: alloc.interestPart,
        principalPart: alloc.principalPart,
      });
    }
  }

  await db.setting.create({
    data: {
      id: "singleton",
      businessName: "Meridian Lending Co.",
      tagline: "Private lending, managed with precision",
      licence: "Licence No. ML-0421",
      email: "office@meridianlending.com",
      phone: "+1 (555) 200-0421",
      address: "14 Meridian House, Financial District",
      currency: "USD",
      defaultRate: 10,
      rateUnit: "monthly",
      defaultTerm: 3,
    },
  });

  const loanCount = await db.loan.count();
  const payCount = await db.payment.count();
  console.log(`Done. ${clients.length} clients, ${loanCount} loans, ${payCount} payments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
