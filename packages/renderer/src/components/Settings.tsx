import React, { useState, useEffect } from 'react';
import { settingsAPI } from '@app/preload';

interface SettingsData {
  addToStartup: boolean;
}

const Settings: React.FC = () => {
  const [originalSettings, setOriginalSettings] = useState<SettingsData>({
    addToStartup: false
  });
  const [settings, setSettings] = useState<SettingsData>({
    addToStartup: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const addToStartup = await settingsAPI.getStartupSetting();
      const settingsData = { addToStartup };
      setSettings(settingsData);
      setOriginalSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof SettingsData, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveError(null);
  };

  const isDirty = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      
      if (settings.addToStartup !== originalSettings.addToStartup) {
        await settingsAPI.setStartupSetting(settings.addToStartup);
      }
      
      setOriginalSettings(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setSaveError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-8">Settings</h1>
        
        {/* Unsaved Changes Callout */}
        {isDirty() && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-yellow-500 font-medium">Unsaved Changes</h3>
                <p className="text-yellow-500/80 text-sm mt-1">
                  You have unsaved changes. Click "Save Changes" to apply them or "Reset" to discard them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-500 font-medium">Save Failed</h3>
                <p className="text-red-500/80 text-sm mt-1">{saveError}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-foreground rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-text mb-6">General Settings</h2>
          
          <div className="space-y-6">
            {/* Add to Startup Setting */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-text font-medium">Add to startup</label>
                <p className="text-text/70 text-sm mt-1">
                  Launch the time tracker automatically when your computer starts
                </p>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.addToStartup}
                    onChange={(e) => handleSettingChange('addToStartup', e.target.checked)}
                    className="sr-only peer"
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-text/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-text/10">
            <button
              onClick={handleReset}
              disabled={saving || !isDirty()}
              className="px-4 py-2 text-text/70 hover:text-text disabled:text-text/40 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;