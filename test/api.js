import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getPopular, getExchanges, getRecap } from '../src/api.js';
import { createMockResponse, createMockErrorResponse, setupTestEnv } from './helpers.js';

describe('API Helper', () => {
  let fetchMock;
  let originalFetch;
  let restoreEnv;

  beforeEach(() => {
    // Setup test environment with required API key
    restoreEnv = setupTestEnv({
      NODE_ENV: 'test',
      IRANCRYPTO_API_KEY: 'test-api-key'
    });
    
    // Create fetch mock
    fetchMock = (url, options) => {
      fetchMock.calls.push({ url, options });
      return fetchMock.response;
    };
    fetchMock.calls = [];
    fetchMock.response = null;
    fetchMock.reset = () => { fetchMock.calls = []; };
    fetchMock.setResponse = (response) => { fetchMock.response = response; };
    
    // Store original fetch and mock it
    originalFetch = global.fetch;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    // Restore original fetch and environment
    global.fetch = originalFetch;
    restoreEnv();
  });

  test('getPopular should return popular cryptos', async () => {
    const mockData = [{ name: 'Bitcoin', volume: '1000' }];
    fetchMock.setResponse(Promise.resolve(createMockResponse(mockData)));

    const data = await getPopular();
    
    assert.deepStrictEqual(data, mockData);
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/popular');
  });

  test('getPopular should throw an error on API failure', async () => {
    fetchMock.setResponse(Promise.resolve(createMockErrorResponse('Server Error', 500)));

    await assert.rejects(
      () => getPopular(),
      /API request failed/
    );
    
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/popular');
  });

  test('getExchanges should return exchanges', async () => {
    const mockData = [{ name: 'Binance', volume: '2000' }];
    fetchMock.setResponse(Promise.resolve(createMockResponse(mockData)));

    const data = await getExchanges();
    
    assert.deepStrictEqual(data, mockData);
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/exchanges');
  });

  test('getExchanges should throw an error on API failure', async () => {
    fetchMock.setResponse(Promise.resolve(createMockErrorResponse('Server Error', 500)));

    await assert.rejects(
      () => getExchanges(),
      /API request failed/
    );
    
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/exchanges');
  });

  test('getRecap should return weekly recap for exchanges', async () => {
    const mockData = [{ name: 'Bitcoin', volume: '3000' }];
    fetchMock.setResponse(Promise.resolve(createMockResponse(mockData)));

    const data = await getRecap('exchange', 'weekly');
    
    assert.deepStrictEqual(data, mockData);
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/recap?type=exchange&interval=weekly&limit=50');
  });

  test('getRecap should return monthly recap for coins', async () => {
    const mockData = [{ name: 'Ethereum', volume: '4000' }];
    fetchMock.setResponse(Promise.resolve(createMockResponse(mockData)));

    const data = await getRecap('coin', 'monthly');
    
    assert.deepStrictEqual(data, mockData);
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/recap?type=coin&interval=monthly&limit=50');
  });

  test('getRecap should throw an error on API failure', async () => {
    fetchMock.setResponse(Promise.resolve(createMockErrorResponse('Server Error', 500)));

    await assert.rejects(
      () => getRecap('coin', 'monthly'),
      /API request failed/
    );
    
    assert.strictEqual(fetchMock.calls.length, 1);
    assert.strictEqual(fetchMock.calls[0].url, 'https://irancrypto.market/api/v1/recap?type=coin&interval=monthly&limit=50');
  });

  test('getRecap should validate parameters', async () => {
    await assert.rejects(
      () => getRecap('invalid', 'weekly'),
      /Invalid type: invalid/
    );

    await assert.rejects(
      () => getRecap('coin', 'invalid'),
      /Invalid interval: invalid/
    );
  });
});
