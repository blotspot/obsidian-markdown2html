import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";


export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
			},
		},
		// You can add your own configuration to override or add rules
		rules: {
			// example: add a rule not in the recommended set and set its severity
			// "obsidianmd/prefer-file-manager-trash": "error",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"package.json",
		"package-lock.json",
		"tsconfig.json",
	])
]);