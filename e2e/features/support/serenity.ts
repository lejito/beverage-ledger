import { chromium, type Browser } from '@playwright/test';
import {
  AfterAll,
  BeforeAll,
  Before,
  defineParameterType,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight, configure, Duration, engage } from '@serenity-js/core';
import { loadEnv } from 'vite';
import { elenco } from '@e2e/screenplay/support/elenco';

// Same as the Playwright configs: .env for local runs, the environment wins.
process.env = { ...loadEnv('test', process.cwd(), ''), ...process.env };

// A sign-in may wait up to a minute for its slot in the API's limit.
setDefaultTimeout(180_000);

configure({
  crew: [
    '@serenity-js/console-reporter',
    ['@serenity-js/serenity-bdd', { specDirectory: './e2e/features' }],
    ['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }],
    ['@serenity-js/core:ArtifactArchiver', { outputDirectory: 'target/site/serenity-gherkin' }],
  ],
  cueTimeout: Duration.ofSeconds(30),
});

let browser: Browser;

BeforeAll(async () => {
  browser = await chromium.launch({ headless: !process.env.HEADED });
});

// Every scenario starts with a fresh cast: each actor in a new browser context.
Before(() => {
  engage(elenco(browser, { viewport: { width: 1280, height: 900 } }));
});

AfterAll(async () => {
  await browser?.close();
});

defineParameterType({
  name: 'actor',
  regexp: /[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/,
  transformer: (nombre: string) => actorCalled(nombre),
});

defineParameterType({
  name: 'pronombre',
  regexp: /él|ella/,
  transformer: () => actorInTheSpotlight(),
});
