import React, { useState, useEffect } from 'react';
import './GlowingTabs.css';

interface GlowingTabsProps {
  tabs: string[];
  defaultTab: string;
  onTabChange: (tab: string) => void;
}

const GlowingTabs: React.FC<GlowingTabsProps> = ({ tabs, defaultTab, onTabChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [borderColor, setBorderColor] = useState('#4f46e5');

  // Animate the border color directly in the component
  useEffect(() => {
    const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#7c3aed', '#4f46e5'];
    let colorIndex = 0;

    const interval = setInterval(() => {
      colorIndex = (colorIndex + 1) % colors.length;
      setBorderColor(colors[colorIndex]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    // Convert tab name to lowercase for consistency
    const tabLower = tab.toLowerCase();
    console.log('Tab clicked:', tab, 'Sending to parent:', tabLower);
    onTabChange(tabLower);
  };

  // Set the initial tab on mount
  useEffect(() => {
    // Convert default tab name to lowercase for consistency
    const defaultTabLower = defaultTab.toLowerCase();
    console.log('Setting initial tab:', defaultTab, 'Sending to parent:', defaultTabLower);
    onTabChange(defaultTabLower);
  }, [defaultTab, onTabChange]);

  return (
    <div className="glowing-tabs-container">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const style = isActive ? {
          borderColor: borderColor,
          boxShadow: `0 0 10px ${borderColor}80`,
          transition: 'border-color 0.5s, box-shadow 0.5s'
        } : {};

        return (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`glowing-tab ${isActive ? 'active' : ''}`}
            style={style}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

export default GlowingTabs;
