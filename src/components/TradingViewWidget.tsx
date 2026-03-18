import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

export const TradingViewWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.TradingView && containerRef.current) {
      new window.TradingView.widget({
        "width": "100%",
        "height": "100%",
        "symbol": "FX:EURJPY",
        "interval": "1",
        "timezone": "Asia/Dhaka",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "save_image": false,
        "container_id": containerRef.current.id,
        "studies": [
          "EMA@tv-basicstudies",
          "RSI@tv-basicstudies"
        ]
      });
    }
  }, []);

  return (
    <div className="tradingview-widget-container w-full h-full">
      <div id="tradingview_chart" ref={containerRef} className="w-full h-full" />
    </div>
  );
};
