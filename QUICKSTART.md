# Smart Account Subscription System - Inicio Rápido

## 🚀 Inicio Completo del Sistema

Necesitas **3 terminales** abiertas:

### Terminal 1: Nodo Hardhat
```bash
npx hardhat node
```
Deja esta terminal corriendo. Verás las cuentas de prueba y los logs de transacciones.

### Terminal 2: Mock Bundler
```bash
npm run bundler
```
Deja esta terminal corriendo. Verás los logs de las UserOperations.

### Terminal 3: Desplegar y Frontend
```bash
# Desplegar contratos (solo una vez)
npm run deploy

# Iniciar frontend
npm run dev
```

## 📱 Configurar MetaMask

1. **Añadir Red Hardhat Local:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Importar Cuenta de Prueba:**
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Esta cuenta tiene 10,000 ETH de prueba

## 🎯 Usar la Aplicación

1. Abre `http://localhost:3000` en tu navegador
2. Conecta tu wallet (MetaMask)
3. Crea tu Smart Account
4. Selecciona un plan de suscripción
5. Prueba los pagos automáticos

## 🔧 Componentes del Sistema

### 1. Hardhat Node (Puerto 8545)
- Blockchain local
- 10 cuentas con 10,000 ETH cada una
- Bloques cada 2 segundos

### 2. Mock Bundler (Puerto 4337)
- Procesa UserOperations
- Compatible con ERC-4337
- Logs detallados de operaciones

### 3. Frontend (Puerto 3000)
- React + Vite
- RainbowKit para wallets
- UI premium con tema oscuro

### 4. Contratos Desplegados
- **SubscriptionModule**: Gestión de suscripciones (ERC-7579)
- **SubscriptionService**: Planes y pagos
- **MockERC20**: Token de prueba (USDC)

## 📊 Direcciones de Contratos

Después de ejecutar `npm run deploy`, verás las direcciones en la terminal:

```
MockERC20: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
SubscriptionModule: 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
SubscriptionService: 0x9A676e781A523b5d0C0e43731313A708CB607508
```

## � Solución de Problemas

### "Cannot connect to localhost:8545"
- Verifica que Terminal 1 (Hardhat node) esté corriendo
- Espera a que veas "Started HTTP and WebSocket JSON-RPC server"

### "Cannot connect to localhost:4337"
- Verifica que Terminal 2 (Mock bundler) esté corriendo
- Deberías ver "🚀 Mock Bundler Started"

### "Cannot connect to localhost:3000"
- Verifica que Terminal 3 (Frontend) esté corriendo
- Ejecuta `npm run dev` en la raíz del proyecto

### "Contracts not deployed"
- Ejecuta `npm run deploy` primero
- Verifica que el archivo `web/public/deployments/localhost.json` existe

### "Wrong network in MetaMask"
- Cambia a la red "Hardhat Local" (Chain ID: 31337)
- Si no existe, añádela manualmente

## 📝 Comandos Útiles

```bash
# Compilar contratos
npm run compile

# Ejecutar tests
npm test

# Ver estado de AA infrastructure
npm run setup-aa

# Reiniciar todo (si algo falla)
# 1. Ctrl+C en todas las terminales
# 2. Reiniciar desde Terminal 1
```

## 🎓 Flujo de Trabajo Típico

1. **Primera vez:**
   ```bash
   # Terminal 1
   npx hardhat node
   
   # Terminal 2
   npm run bundler
   
   # Terminal 3
   npm run deploy
   npm run dev
   ```

2. **Días siguientes (si no cambiaste contratos):**
   ```bash
   # Terminal 1
   npx hardhat node
   
   # Terminal 2
   npm run bundler
   
   # Terminal 3
   npm run dev
   ```

3. **Si modificas contratos:**
   ```bash
   # Recompilar
   npm run compile
   
   # Redesplegar
   npm run deploy
   
   # Reiniciar frontend
   npm run dev
   ```

## ✨ Características Implementadas

✅ Smart Accounts modulares (ERC-7579)  
✅ Suscripciones con pagos automáticos  
✅ Mock Bundler funcional (ERC-4337)  
✅ 3 planes de suscripción  
✅ Historial de pagos  
✅ UI moderna y responsive  

## 🚀 Próximos Pasos

Una vez que todo funcione localmente:

1. Probar diferentes escenarios de suscripción
2. Experimentar con los módulos
3. Modificar los contratos para añadir funcionalidad
4. Desplegar en testnet (Sepolia)
5. Integrar bundler real (Pimlico, Alchemy, etc.)

---

**¿Problemas?** Revisa los logs en cada terminal para ver qué está fallando.
