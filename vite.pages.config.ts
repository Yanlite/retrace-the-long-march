import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'pages',base:'/retrace-the-long-march/',publicDir:'../public',plugins:[react()],build:{outDir:'../out',emptyOutDir:true},preview:{host:'127.0.0.1',port:5175}});
