import { useEffect, useRef } from 'react';
import { devicesApi } from '../lib/api';

export function usePeripheralTracking(sessionId: number, candidateId?: number | null) {
  const registeredDevices = useRef<Map<string, number>>(new Map()); // deviceGroupId -> backendId
  const systemDeviceId = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId || !candidateId) return;

    let isMounted = true;

    const setupDevices = async () => {
      try {
        // 1. Register a virtual system device (browser window context)
        const sysDevice = await devicesApi.registerDevice(sessionId, candidateId, {
          device_id: `browser-${navigator.userAgent}`,
          device_type: 'monitor', // Using monitor to signify the main display area
          device_name: 'Main Browser Window',
          capabilities: { userAgent: navigator.userAgent },
        });
        
        if (!isMounted) return;
        systemDeviceId.current = sysDevice.id;

        // 2. Enumerate standard media devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          
          for (const device of devices) {
            // We need a stable ID. For cameras/mics, groupId is often stable during a session.
            const stableId = device.deviceId || device.groupId || `unknown-${device.kind}`;
            
            let deviceType = 'other';
            if (device.kind === 'videoinput') deviceType = 'webcam';
            else if (device.kind === 'audioinput') deviceType = 'microphone';
            else if (device.kind === 'audiooutput') deviceType = 'speakers';

            const registeredDevice = await devicesApi.registerDevice(sessionId, candidateId, {
              device_id: stableId,
              device_type: deviceType,
              device_name: device.label || `Unknown ${deviceType}`,
              capabilities: { kind: device.kind },
            });

            if (!isMounted) return;
            registeredDevices.current.set(stableId, registeredDevice.id);
          }
        }
      } catch (error) {
        console.error('Failed to setup peripheral tracking:', error);
      }
    };

    setupDevices();

    // 3. Setup window event listeners for anti-cheat
    const trackEvent = (eventType: string, data: Record<string, any> = {}) => {
      if (systemDeviceId.current) {
        devicesApi.trackEvent(sessionId, {
          device_id: systemDeviceId.current,
          event_type: eventType,
          event_data: data,
          window_title: document.title,
        }).catch(console.error);
      }
    };

    const handleVisibilityChange = () => {
      trackEvent(document.visibilityState === 'hidden' ? 'tab_hidden' : 'tab_visible', {
        state: document.visibilityState
      });
    };

    const handleBlur = () => trackEvent('window_blur');
    const handleFocus = () => trackEvent('window_focus');

    // copy/paste tracking
    const handleCopy = () => trackEvent('clipboard_copy');
    const handlePaste = () => trackEvent('clipboard_paste');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);

      // Gracefully mark system device inactive if possible
      if (systemDeviceId.current) {
        devicesApi.updateStatus(systemDeviceId.current, candidateId, 'inactive').catch(console.error);
      }
      for (const [_, backendId] of registeredDevices.current.entries()) {
        devicesApi.updateStatus(backendId, candidateId, 'inactive').catch(console.error);
      }
    };
  }, [sessionId, candidateId]);
}
