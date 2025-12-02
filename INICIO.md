# 🚀 Guía de Inicio - Smart Account Subscriptions

## 📍 Estructura de Directorios

```
AA-dApp-Sergio/          ← Directorio raíz (aquí ejecutas la mayoría de comandos)
├── bundler/             ← Mock bundler
├── contracts/           ← Contratos Solidity
├── scripts/             ← Scripts de despliegue
├── web/                 ← Frontend React
└── package.json         ← Configuración principal
```

---

## ⚡ Inicio Rápido (3 Terminales)

### 🔵 Terminal 1: Nodo Hardhat

**Ubicación:** `AA-dApp-Sergio/` (raíz)

```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npx hardhat node
```

✅ **Dejar corriendo** - Verás las cuentas de prueba y logs de transacciones

---

### 🟢 Terminal 2: Mock Bundler

**Ubicación:** `AA-dApp-Sergio/` (raíz)

```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npm run bundler
```

✅ **Dejar corriendo** - Verás "🚀 Mock Bundler Started"

---

### 🟡 Terminal 3: Desplegar + Frontend

**Ubicación:** `AA-dApp-Sergio/` (raíz)

```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio

# 1. Desplegar contratos (solo la primera vez)
npm run deploy

# 2. Instalar dependencias del frontend (solo la primera vez)
cd web
npm install
cd ..

# 3. Iniciar frontend
cd web
npm run dev
```

✅ Abre `http://localhost:3000` en tu navegador

---

## 📝 Resumen de Comandos por Terminal

| Terminal | Directorio | Comando | Descripción |
|----------|-----------|---------|-------------|
| 1️⃣ | `AA-dApp-Sergio/` | `npx hardhat node` | Blockchain local |
| 2️⃣ | `AA-dApp-Sergio/` | `npm run bundler` | Bundler ERC-4337 |
| 3️⃣ | `AA-dApp-Sergio/web/` | `npm run dev` | Frontend React |

---

## 🔧 Primera Vez - Setup Completo

Ejecuta estos comandos **una sola vez** desde `AA-dApp-Sergio/`:

```bash
# 1. Instalar dependencias raíz (Hardhat, contratos)
npm install

# 2. Instalar dependencias del bundler
cd bundler
npm install
cd ..

# 3. Instalar dependencias del frontend
cd web
npm install
cd ..

# 4. Compilar contratos
npm run compile
```

---

## 🎯 Flujo de Trabajo Diario

### Día 1 (Primera vez):

**Terminal 1:**
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npx hardhat node
```

**Terminal 2:**
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npm run bundler
```

**Terminal 3:**
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npm run deploy
cd web
npm run dev
```

### Días siguientes (sin cambios en contratos):

**Terminal 1:**
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npx hardhat node
```

**Terminal 2:**
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npm run bundler
```

**Terminal 3:**
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio\web
npm run dev
```

---

## 🌐 Configurar MetaMask

1. **Añadir Red Hardhat:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Importar Cuenta de Prueba:**
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Balance: 10,000 ETH

---

## ✅ Verificación de Estado

### ¿Está todo corriendo?

**Terminal 1 (Hardhat):**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

**Terminal 2 (Bundler):**
```
🚀 Mock Bundler Started
📡 Listening on: http://localhost:4337
```

**Terminal 3 (Frontend):**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find package.json"
```bash
# Asegúrate de estar en el directorio correcto
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
pwd  # Debe mostrar: C:\Users\franc\Proyectos\AA-dApp-Sergio
```

### Error: "Port 8545 already in use"
```bash
# Mata el proceso anterior
# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 8545).OwningProcess | Stop-Process
```

### Error: "Contracts not deployed"
```bash
cd c:\Users\franc\Proyectos\AA-dApp-Sergio
npm run deploy
```

### Frontend no carga
```bash
# Reinstalar dependencias
cd c:\Users\franc\Proyectos\AA-dApp-Sergio\web
rm -rf node_modules
npm install
npm run dev
```

---

## 📦 Estructura de package.json

- **Raíz** (`AA-dApp-Sergio/package.json`): Hardhat, scripts de despliegue
- **Bundler** (`bundler/package.json`): Express, ethers para el bundler
- **Web** (`web/package.json`): React, Vite, RainbowKit, Wagmi

---

## 🎓 Comandos Útiles

Todos desde `AA-dApp-Sergio/`:

```bash
# Compilar contratos
npm run compile

# Ejecutar tests
npm test

# Ver info de AA
npm run setup-aa

# Desplegar contratos
npm run deploy

# Iniciar bundler
npm run bundler
```

Desde `AA-dApp-Sergio/web/`:

```bash
# Iniciar dev server
npm run dev

# Build para producción
npm run build
```

---

## 🎯 Checklist de Inicio

- [ ] Terminal 1: `npx hardhat node` corriendo
- [ ] Terminal 2: `npm run bundler` corriendo  
- [ ] Terminal 3: Contratos desplegados con `npm run deploy`
- [ ] Terminal 3: Frontend corriendo con `cd web && npm run dev`
- [ ] MetaMask configurado con red Hardhat Local
- [ ] Cuenta de prueba importada en MetaMask
- [ ] Navegador abierto en `http://localhost:3000`

---

**¿Todo listo?** ¡Conéctate con tu wallet y crea tu primera Smart Account! 🚀
