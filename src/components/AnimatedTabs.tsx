import React, { useState } from 'react';
import './AnimatedTabs.css';

interface AnimatedTabsProps {
  tabs: string[];
  defaultTab: string;
  onTabChange: (tab: string) => void;
}

const AnimatedTabs: React.FC<AnimatedTabsProps> = ({ tabs, defaultTab, onTabChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  return (
    <div className="w-full">
      <div className="tab-container">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnimatedTabs;
