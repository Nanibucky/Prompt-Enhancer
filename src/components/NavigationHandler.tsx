import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set up listener for navigation events from the main process
    const unsubscribe = window.api?.onNavigateToLogin?.(() => {
      console.log('Received navigate-to-login event');
      navigate('/login');
    });

    // Clean up the listener when the component unmounts
    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  // This component doesn't render anything
  return null;
};

export default NavigationHandler;
