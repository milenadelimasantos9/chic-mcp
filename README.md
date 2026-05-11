# Chic MCP

Este MCP conversa com o backend local do site em `http://localhost:3333/api`.

## Comandos

```powershell
cd "C:\Users\Milena\Desktop\Teste IA mpc server\chic-mcp"
npm install
npm start
```

## Vinculo no cliente MCP

```json
{
  "mcpServers": {
    "chic-schedule": {
      "command": "node",
      "args": [
        "C:\\Users\\Milena\\Desktop\\Teste IA mpc server\\chic-mcp\\server.js"
      ],
      "env": {
        "CHIC_API_URL": "http://localhost:3333/api"
      }
    }
  }
}
```
