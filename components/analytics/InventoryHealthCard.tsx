"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface TicketTypeStats {
  soldCount: number;
  revenue: number;
  remaining?: number;
  total?: number;
}

interface InventoryHealthProps {
  ticketBreakdown: Record<string, TicketTypeStats>;
  totalRevenue: number;
  totalTicketsSold: number;
  eventName?: string;
}

export default function InventoryHealthCard({
  ticketBreakdown,
  totalRevenue,
  totalTicketsSold,
  eventName,
}: InventoryHealthProps) {
  const getStatusBadge = (stats: TicketTypeStats) => {
    if (!stats.total) {
      return stats.soldCount > 0 ? (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Selling
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300">
          <Clock className="w-3 h-3 mr-1" />
          No Sales
        </Badge>
      );
    }

    const remaining = stats.remaining || 0;
    const percentSold = (stats.soldCount / stats.total) * 100;

    if (remaining === 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Sold Out
        </Badge>
      );
    }

    if (percentSold >= 80) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Almost Full
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  const getProgressPercentage = (stats: TicketTypeStats) => {
    if (stats.total) {
      return (stats.soldCount / stats.total) * 100;
    }
    // If no total, show progress based on arbitrary goal (e.g., 50 tickets)
    return Math.min((stats.soldCount / 50) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const breakdownEntries = Object.entries(ticketBreakdown);

  if (breakdownEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Health</CardTitle>
          <CardDescription>
            No ticket sales data available yet
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Inventory Health
            </CardTitle>
            {eventName && (
              <CardDescription className="mt-1">{eventName}</CardDescription>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-sm text-gray-500">
              {totalTicketsSold} tickets sold
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {breakdownEntries.map(([typeName, stats]) => {
            const progressPercent = getProgressPercentage(stats);
            
            return (
              <div
                key={typeName}
                className="p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-gray-800 text-lg">{typeName}</h4>
                  {getStatusBadge(stats)}
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(stats.revenue)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.soldCount} ticket{stats.soldCount !== 1 ? 's' : ''} sold
                    </p>
                  </div>

                  {stats.total && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-semibold text-gray-900">
                        {stats.remaining || 0} / {stats.total}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        progressPercent >= 80
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          : progressPercent >= 50
                          ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                          : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Total Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {breakdownEntries.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg per Type</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(totalTicketsSold / breakdownEntries.length)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalRevenue / breakdownEntries.length)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
