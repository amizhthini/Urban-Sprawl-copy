import React, { useState, useEffect, useCallback } from 'react';
import { fetchGtaPopulationInfo, askChatbot } from './services/geminiService';
import { GtaPopulationData } from './types';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import PopulationChart from './components/PopulationChart';
import GtaMap from './components/GtaMap';
import UrbanSprawlSection from './components/UrbanSprawlSection';
import PredictedHotspots from './components/PredictedHotspots';
import ChatModal from './components/ChatModal';
import type { Content } from '@google/genai';

const urbanSprawlFactors: string[] = [
  "Population growth",
  "Economic indicators (job growth, income levels)",
  "Land Use and Land Cover (LULC)",
  "Transportation Infrastructure",
  "Zoning and Land Use Regulations",
  "Proximity to essential services",
  "Proximity to natural features",
];

type Page = 'intro' | 'hotspots' | 'population';
export type ChatMessage = { role: 'user' | 'model'; text: string };

// --- Page Components ---
const IntroPage: React.FC<{ data: GtaPopulationData }> = ({ data }) => (
  <div className="space-y-8 animate-fade-in">
    <section className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 transform hover:scale-[1.01] transition-transform duration-300">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-4">
        Executive Summary
      </h2>
      <p className="text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300">
        {data.summary}
      </p>
    </section>

    {data.keyPoints && data.keyPoints.length > 0 && (
      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-6 text-center">
          Key Insights & Projections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.keyPoints.map((point, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 flex flex-col items-start space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex-shrink-0 bg-teal-100 dark:bg-teal-900 p-3 rounded-full">
                <CheckCircleIcon className="h-6 w-6 text-teal-500 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  {point.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-6">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}
  </div>
);

// --- Hotspots Page ---
const HotspotsPage: React.FC<{ data: GtaPopulationData; location: string; onLocationChange: (loc: string) => void }> = ({
  data,
  location,
  onLocationChange,
}) => (
  <div className="space-y-8 animate-fade-in">
    <GtaMap location={location} onLocationChange={onLocationChange} />
    {data.predictedHotspots && data.predictedHotspots.length > 0 && (
      <PredictedHotspots hotspots={data.predictedHotspots} onViewHotspot={onLocationChange} />
    )}
    <section className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
      <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center">
        Factors Considered for Estimates
      </h3>
      <ul className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
        {urbanSprawlFactors.map((factor, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="w-5 h-5 mr-3 mt-1 text-teal-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{factor}</span>
          </li>
        ))}
      </ul>
    </section>
  </div>
);

// --- Population Page ---
const PopulationPage: React.FC<{ data: GtaPopulationData; location: string }> = ({ data, location }) => (
  <div className="space-y-8 animate-fade-in">
    {data.populationTrend && data.populationTrend.length > 0 && (
      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-6 text-center">
          Population Trend for {location}
        </h2>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
          <PopulationChart data={data.populationTrend} />
        </div>
      </section>
    )}

    {data.urbanSprawlPredictions && data.urbanSprawlPredictions.length > 0 && (
      <UrbanSprawlSection predictions={data.urbanSprawlPredictions} />
    )}
  </div>
);

// --- Icons ---
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// --- Sidebar ---
const Sidebar: React.FC<{ activePage: Page; setPage: (page: Page) => void; onOpenChat: () => void }> = ({
  activePage,
  setPage,
  onOpenChat,
}) => {
  const navItems = [
    { id: 'intro', label: 'Introduction', icon: '🏠' },
    { id: 'hotspots', label: 'Growth Hotspots', icon: '🗺️' },
    { id: 'population', label: 'Population Analysis', icon: '📊' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 p-4 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 hidden md:flex md:flex-col">
      <div className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-10 pl-2">
        GTA Insights
      </div>
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setPage(item.id as Page)}
                className={`flex items-center w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                  activePage === item.id
                    ? 'bg-teal-50 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">
        <button
          onClick={onOpenChat}
          className="flex items-center w-full text-left p-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          💬 <span className="ml-3 font-semibold">Ask Urbo</span>
        </button>
      </div>
    </aside>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const [data, setData] = useState<GtaPopulationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('Greater Toronto Area');
  const [page, setPage] = useState<Page>('intro');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fetchData = useCallback(async (loc: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchGtaPopulationInfo(loc);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(location);
  }, [location, fetchData]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      setIsChatLoading(true);
      const updatedMessages: ChatMessage[] = [...chatMessages, { role: 'user', text: message }];
      setChatMessages(updatedMessages);

      try {
        const history: Content[] = updatedMessages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        }));
        const response = await askChatbot(message, history);
        setChatMessages((prev) => [...prev, { role: 'model', text: response }]);
      } catch (err: any) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'model', text: `Sorry, something went wrong: ${err.message}` },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatMessages]
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-500">
      <Sidebar activePage={page} setPage={setPage} onOpenChat={() => setIsChatOpen(true)} />
      <div className="flex-1 flex flex-col max-h-screen overflow-y-auto">
        <Header title={data?.title || 'GTA Population Growth'} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {isLoading && <LoadingSpinner />}
          {error && <ErrorDisplay message={error} onRetry={() => fetchData(location)} />}
          {data && !isLoading && !error && (
            <>
              {page === 'intro' && <IntroPage data={data} />}
              {page === 'hotspots' && <HotspotsPage data={data} location={location} onLocationChange={setLocation} />}
              {page === 'population' && <PopulationPage data={data} location={location} />}
            </>
          )}
        </main>
        <footer className="text-center py-6 mt-auto text-gray-500 dark:text-gray-400 text-sm">
          <p>Generated by Google Gemini API</p>
          <p>UI/UX by Parameswaran Kesakumaran 🚀</p>
        </footer>
      </div>
      {isChatOpen && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
        />
      )}
    </div>
  );
};

export default App;
