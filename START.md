# ✅ GUÍA DE INICIO FINAL - Todo Solucionado

## 🎯 Estado Actual

✅ Hardhat node corriendo (Terminal 1)  
✅ Mock bundler corriendo (Terminal 2)  
✅ Contratos desplegados  
✅ Dependencias frontend instaladas  

---

## 🚀 Iniciar Frontend (Terminal 3)

**Desde la raíz del proyecto:**

```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio\web
npm run dev
```

Deberías ver:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

**Abre tu navegador en:** `http://localhost:3000`

---

## 📋 Resumen de las 3 Terminales

| Terminal | Comando | Ubicación | Estado |
|----------|---------|-----------|--------|
| 1️⃣ | `npx hardhat node` | `AA-dApp-Sergio/` | ✅ Corriendo |
| 2️⃣ | `node mock-bundler.js` | `AA-dApp-Sergio/bundler/` | ✅ Corriendo |
| 3️⃣ | `npm run dev` | `AA-dApp-Sergio/web/` | ⏳ Iniciar ahora |

---

## 🔧 Problemas Solucionados

✅ **Viem version conflict** → Actualizado a 2.21.0  
✅ **Missing bundler script** → Añadido a package.json raíz  
✅ **Permissionless dependency** → Removido (no necesario para demo)  
✅ **Frontend dependencies** → Reinstalados (617 packages)  

---

## 🌐 Configurar MetaMask

1. **Añadir Red Hardhat:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Importar Cuenta:**
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## 📊 Direcciones de Contratos Desplegados

```
MockERC20:           0x5FbDB2315678afecb367f032d93F642f64180aa3
SubscriptionModule:  0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
SubscriptionService: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

---

## 🎮 Usar la Aplicación

1. Abre `http://localhost:3000`
2. Conecta MetaMask (red Hardhat Local)
3. Crea tu Smart Account
4. Selecciona un plan de suscripción:
   - **Basic**: 0.001 ETH/hora
   - **Premium**: 0.002 ETH/hora
   - **Token**: 10 USDC/hora
5. Prueba pagos manuales

---

## 🐛 Si algo falla

### Frontend no inicia
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio\web
npm run dev
```

### Ver logs del bundler
Revisa Terminal 2, deberías ver:
```
🚀 Mock Bundler Started
📡 Listening on: http://localhost:4337
```

### Reiniciar todo
1. Ctrl+C en todas las terminales
2. Reiniciar desde Terminal 1

---

## ✨ Comandos Útiles

**Desde raíz (`AA-dApp-Sergio/`):**
```bash
npm run compile    # Compilar contratos
npm test          # Ejecutar tests
npm run deploy    # Redesplegar contratos
npm run bundler   # Iniciar bundler (alternativa)
```

**Desde web (`AA-dApp-Sergio/web/`):**
```bash
npm run dev       # Iniciar frontend
npm run build     # Build producción
```

---

**🎉 ¡Todo listo! Ahora sí deberías poder usar la aplicación sin errores.**
