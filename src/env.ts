import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvDefaults() {
  try {
    const envDefaultsPath = join(process.cwd(), '.env.defaults');
    const envDefaults = readFileSync(envDefaultsPath, 'utf-8');
    
    envDefaults.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.log('No .env.defaults file found, using environment variables only');
  }
}

loadEnvDefaults();
