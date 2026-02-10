"use client";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, BoxIcon, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = [
  {
    title: "Sales Report",
    description:
      "Weekly, monthly, or all-time sales breakdown with fees, costs, and margins",
    href: "/reports/sales",
    icon: DollarSign,
    color: "text-green-600 bg-green-100",
  },
  {
    title: "Product Report",
    description:
      "Revenue breakdown by product with received vs pending payouts",
    href: "/reports/products",
    icon: BoxIcon,
    color: "text-blue-600 bg-blue-100",
  },
  {
    title: "Payout Reconciliation",
    description:
      "Import payout CSVs, track fees, disputes, and pending amounts",
    href: "/reports/payouts",
    icon: CreditCard,
    color: "text-orange-600 bg-orange-100",
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Financial reports and analytics"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.color}`}
                  >
                    <report.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base mt-3">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
