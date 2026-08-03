import { expect, test } from '@playwright/test';

test('registers, resolves a PubChem molecule, renders it, and saves it to the library', async ({ page }) => {
  await page.addInitScript(() => {
    window.$3Dmol = {
      createViewer: () => ({
        addModel: () => {},
        setStyle: () => {},
        zoomTo: () => {},
        render: () => {},
        removeAllModels: () => {},
        clear: () => {},
      }),
    };
  });

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({ json: { token: 'e2e-token', user: { id: 'user-1', name: 'E2E Chemist', email: 'chemist@example.test' } } });
  });
  await page.route('**/api/compounds', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { compounds: [], pagination: { page: 1, total: 0, pages: 0 } } });
      return;
    }
    await route.fulfill({ json: { compound: { id: 'compound-1', name: 'Aspirin', formula: 'C9H8O4', cid: 2244, notes: '' } } });
  });
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/rest/pug/compound/name/as*/cids/JSON?limit=12', async (route) => {
    await route.fulfill({ json: { IdentifierList: { CID: [2244] } } });
  });
  await page.route('**/rest/pug/compound/cid/2244/synonyms/JSON', async (route) => {
    await route.fulfill({ json: { InformationList: { Information: [{ Synonym: ['Aspirin'] }] } } });
  });
  await page.route('**/rest/pug/compound/cid/2244/property/MolecularFormula,IUPACName/JSON', async (route) => {
    await route.fulfill({ json: { PropertyTable: { Properties: [{ MolecularFormula: 'C9H8O4', IUPACName: '2-acetyloxybenzoic acid' }] } } });
  });
  await page.route('**/rest/pug/compound/cid/2244/SDF?record_type=3d', async (route) => {
    await route.fulfill({ contentType: 'chemical/x-mdl-sdfile', body: 'Aspirin\n  E2E\n\n  0  0  0  0  0  0            999 V2000\nM  END' });
  });

  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Chemist');
  await page.getByLabel('Email').fill('chemist@example.test');
  await page.getByLabel('Password').fill('secure-pass');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Virtual Chemistry Lab' })).toBeVisible();
  await page.getByLabel('Search PubChem for a compound').fill('as');
  await page.getByRole('option', { name: 'Aspirin' }).click();
  await expect(page.getByText('Aspirin', { exact: true })).toBeVisible();
  await expect(page.getByLabel('3D structure of Aspirin')).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Save compound' })).toBeVisible();
  await page.getByRole('button', { name: 'Save compound' }).last().click();
  await expect(page.getByText('1 saved')).toBeVisible();
  await expect(page.getByText('Aspirin', { exact: true }).last()).toBeVisible();
});
