import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/ask' : 'http://127.0.0.1:3000'
		},
		watch: {
			usePolling: true,
		},
	}
});
