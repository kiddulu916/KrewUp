'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { ExperienceFilter } from '@/features/profiles/components/experience-filter';
import { ExperienceBadge } from '@/features/profiles/components/experience-badge';
import Link from 'next/link';

type Worker = {
  id: string;
  name: string;
  trade: string;
  sub_trade?: string | null;
  location: string;
  bio?: string | null;
  total_years: number;
};

export default function WorkerSearchPage() {
  const [searchResults, setSearchResults] = useState<Worker[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Find Experienced Workers</h1>
        <p className="mt-2 text-gray-600">
          Search for workers by years of experience and trade specialty
        </p>
      </div>

      {/* Experience Filter */}
      <ExperienceFilter
        onSearchResults={(results) => {
          setSearchResults(results);
          setIsSearching(false);
        }}
        onSearchStart={() => setIsSearching(true)}
      />

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Search Results
            {searchResults.length > 0 && ` (${searchResults.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-krewup-blue"></div>
              <p className="mt-4 text-gray-600">Searching for workers...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No search results yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Use the filters above to search for experienced workers
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((worker) => (
                <div
                  key={worker.id}
                  className="border rounded-xl p-4 hover:border-krewup-blue hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold text-lg shadow-lg">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{worker.name}</h3>
                          <p className="text-sm text-gray-600">
                            {worker.trade}
                            {worker.sub_trade && ` - ${worker.sub_trade}`}
                          </p>
                        </div>
                      </div>

                      <div className="ml-15 space-y-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Location:</span> {worker.location}
                        </p>
                        {worker.bio && (
                          <p className="text-sm text-gray-600 italic">{worker.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2 items-end">
                      <ExperienceBadge years={worker.total_years} />
                      <Link href={`/dashboard/profiles/${worker.id}`}>
                        <Button size="sm">View Profile</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
