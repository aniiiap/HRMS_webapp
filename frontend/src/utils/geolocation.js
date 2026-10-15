/**
 * Captures fresh, high-accuracy coordinates for attendance geofencing.
 *
 * Uses enableHighAccuracy: true (Wi-Fi BSSID scanning / GPS) and maximumAge: 0
 * to prevent returning stale, cached coordinates or coarse ISP gateway IP
 * locations (which place users hundreds of kilometers away at regional data hubs).
 */
export function captureLocation() {
  // Purge any stale coordinate caches from previous versions
  try {
    localStorage.removeItem('hrms_last_location')
  } catch {
    // Ignore storage errors in private browsing
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      reject(new Error('Geolocation is not supported on this device/browser.'))
      return
    }

    function formatError(error) {
      if (!error) return new Error('Unable to determine location. Please try again.')
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          return new Error('Location permission denied. Please allow location access in your browser settings.')
        case 2: // POSITION_UNAVAILABLE
          return new Error('Location unavailable. Please ensure location services / Wi-Fi are turned on.')
        case 3: // TIMEOUT
          return new Error('Location request timed out. Please check your network and try again.')
        default:
          return new Error(error.message || 'Unable to determine location.')
      }
    }

    // Try high accuracy first (Wi-Fi triangulation or GPS)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (highAccError) => {
        // If high accuracy times out (e.g. wired PC without Wi-Fi), attempt fallback
        if (highAccError?.code === 3) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              resolve({
                latitude: fallbackPos.coords.latitude,
                longitude: fallbackPos.coords.longitude,
              })
            },
            (fallbackErr) => {
              reject(formatError(fallbackErr))
            },
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 0 },
          )
        } else {
          reject(formatError(highAccError))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}
