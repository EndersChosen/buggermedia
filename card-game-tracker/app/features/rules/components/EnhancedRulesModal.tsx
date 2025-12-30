'use client';

import { useState, useMemo } from 'react';
import { GameRules, RuleSection } from '@/types/game.types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';

interface EnhancedRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  rules: GameRules;
}

export function EnhancedRulesModal({ isOpen, onClose, gameName, rules }: EnhancedRulesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // If fullRules exist, use them; otherwise fall back to basic rules
  const hasFullRules = rules.fullRules && rules.fullRules.sections.length > 0;

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!hasFullRules) return [];

    const query = searchQuery.toLowerCase();
    if (!query) return rules.fullRules!.sections;

    const filterSection = (section: RuleSection): RuleSection | null => {
      const matchesTitle = section.title.toLowerCase().includes(query);
      const matchesContent = section.content.toLowerCase().includes(query);

      const filteredSubsections = section.subsections
        ?.map(filterSection)
        .filter((s): s is RuleSection => s !== null);

      if (matchesTitle || matchesContent || (filteredSubsections && filteredSubsections.length > 0)) {
        return {
          ...section,
          subsections: filteredSubsections?.length ? filteredSubsections : section.subsections,
        };
      }

      return null;
    };

    return rules.fullRules!.sections
      .map(filterSection)
      .filter((s): s is RuleSection => s !== null);
  }, [hasFullRules, rules.fullRules, searchQuery]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderTableOfContents = (sections: RuleSection[], level = 0) => {
    return sections.map((section) => (
      <div key={section.id} style={{ marginLeft: `${level * 1}rem` }}>
        <button
          onClick={() => scrollToSection(section.id)}
          className={`
            text-left w-full py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
            ${activeSection === section.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300'}
          `}
        >
          {section.title}
        </button>
        {section.subsections && renderTableOfContents(section.subsections, level + 1)}
      </div>
    ));
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderSection = (section: RuleSection, level = 0) => {
    const isExpanded = expandedSections.has(section.id);
    const hasSubsections = section.subsections && section.subsections.length > 0;

    return (
      <div key={section.id} id={`section-${section.id}`} className="mb-6">
        <div className="flex items-start gap-2">
          {hasSubsections && (
            <button
              onClick={() => toggleSection(section.id)}
              className="mt-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          )}
          <div className="flex-1">
            <h3
              className={`font-semibold mb-2 ${
                level === 0
                  ? 'text-2xl text-gray-900 dark:text-white'
                  : level === 1
                  ? 'text-xl text-gray-800 dark:text-gray-100'
                  : 'text-lg text-gray-700 dark:text-gray-200'
              }`}
            >
              {highlightText(section.title)}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {highlightText(section.content)}
            </div>
          </div>
        </div>

        {hasSubsections && (isExpanded || searchQuery) && (
          <div className="ml-6 mt-4 space-y-4">
            {section.subsections!.map((subsection) => renderSection(subsection, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderBasicRules = () => (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Overview</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{rules.overview}</p>
      </div>

      {/* Setup */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Setup</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          {rules.setup.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Gameplay */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gameplay</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          {rules.gameplay.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Scoring */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scoring</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          {rules.scoring.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Winning */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Winning</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{rules.winning}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${gameName} - Rules`} size="xl">
      {hasFullRules ? (
        <div className="flex flex-col lg:flex-row gap-6 h-[70vh]">
          {/* Left sidebar - Table of Contents */}
          <div className="lg:w-1/3 border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Table of Contents
            </h3>
            <div className="space-y-1">
              {renderTableOfContents(filteredSections)}
            </div>
          </div>

          {/* Right content area */}
          <div className="lg:w-2/3 flex flex-col">
            {/* Search bar */}
            <div className="mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {filteredSections.length} section(s) found
                </p>
              )}
            </div>

            {/* Rules content */}
            <div className="flex-1 overflow-y-auto">
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => renderSection(section))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No results found for "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        renderBasicRules()
      )}
    </Modal>
  );
}
