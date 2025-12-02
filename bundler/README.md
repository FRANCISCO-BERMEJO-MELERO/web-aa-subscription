# Mock Bundler

Mock ERC-4337 bundler para pruebas locales.

## Uso

```bash
# Desde la raíz del proyecto
npm run bundler

# O directamente
cd bundler
npm start
```

## Endpoints

- **Health Check**: `GET http://localhost:4337/health`
- **RPC**: `POST http://localhost:4337/rpc`

## Métodos Soportados

- `eth_supportedEntryPoints`
- `eth_sendUserOperation`
- `eth_estimateUserOperationGas`
- `eth_getUserOperationByHash`
- `eth_getUserOperationReceipt`

## Características

✅ Simula procesamiento de UserOperations  
✅ Compatible con ERC-4337  
✅ Estimación de gas  
✅ Tracking de operaciones  
✅ Logs detallados  

## Nota

Este es un bundler simplificado para desarrollo local. No debe usarse en producción.
