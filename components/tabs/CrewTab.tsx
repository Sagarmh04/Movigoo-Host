"use client";

import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CrewTab() {
  return (
    <div className="min-h-[600px] flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="rounded-full bg-blue-50 p-6 mb-6">
            <Users className="h-16 w-16 text-blue-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Crew Support is Coming Soon!
          </h1>
          
          <p className="text-lg text-gray-600 max-w-md">
            We are building a powerful way for you to manage your Volunteers. Stay Tuned!!!
          </p>
          
          <div className="mt-8 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse delay-75"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse delay-150"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

