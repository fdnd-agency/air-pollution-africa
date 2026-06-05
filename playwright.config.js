import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
	webServer: { 
        command: 'npm run build && npm run preview', port: 4173,     reuseExistingServer: false,
        env: {
            E2E_TEST_MODE: '1'
        }
    },
	testMatch: '**/*.e2e.{ts,js}',
});
