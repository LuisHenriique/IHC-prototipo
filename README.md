# Pão Fraterno — protótipo de alta fidelidade

Implementação interativa das oito telas SVG da Parte 3. Mantém as cores, tipografia, posições, mapas ilustrativos e componentes do protótipo de média fidelidade. Não exige conta, API, banco de dados ou instalação de dependências.

## Executar

Na pasta `Project`:

```sh
python3 build.py
python3 -m http.server 8000 --directory dist
```

Abra **http://localhost:8000**. Não abra o HTML por `file://`: o navegador bloqueia o carregamento das telas SVG.

Os SVGs originais ficam em `Project/Telas` (o build também aceita a localização antiga, na pasta acima de `Project`). Depois de gerada, a pasta `dist` é independente: só ela precisa ser publicada.

## Publicar e obter o link para avaliação

**Opção simples: Netlify Drop**

1. Execute `python3 build.py`.
2. Acesse https://app.netlify.com/drop e envie a pasta `Project/dist`.
3. Copie o endereço HTTPS gerado e inclua no trabalho como **Protótipo de alta fidelidade**.
4. Abra o endereço em janela anônima e no celular para verificar o acesso público, sem login.

**Alternativa: GitHub Pages**

Publique o conteúdo de `dist` em um repositório e ative **Settings → Pages → Deploy from a branch**, selecionando a pasta que contém `index.html`. Não publique apenas os arquivos-fonte de `Project`, pois as telas são geradas em `dist/assets`.

Não há link público criado automaticamente neste projeto. `localhost` não é um link acessível ao avaliador. A entrega também exige um link aberto do protótipo de média fidelidade na ferramenta de prototipação; este site não substitui essa exigência.

## Fluxos para testar

### Coordenador

1. Entre como coordenador.
2. Consulte o mapa e o alerta da Praça XV; abra **Ver detalhe** para comparar estoque e meta.
3. Acesse **Doações**, escolha um alimento, ajuste a quantidade e uma validade futura. Os valores também podem ser digitados diretamente.
4. Salve. O painel mostra o estoque e a projeção atualizados.
5. Acesse **Rota sugerida** e **Aprovar e enviar aos voluntários**.
6. Use **Sair** para trocar de perfil.

### Voluntário

1. Entre como voluntário. A rota de exemplo fica disponível mesmo sem aprovação, para permitir testes independentes.
2. Confirme a chegada, ajuste a contagem e toque em **Sopa entregue**.
3. Teste **Desfazer último registro**, ajuste e confirme de novo.
4. Toque em **Próxima parada**. Repita nas cinco paradas.
5. Confira o resumo calculado e finalize o turno.

A contagem inicial de 24 da primeira parada reproduz o SVG; nas seguintes, o valor inicial respeita a previsão de cada parada. As contagens podem ser ajustadas livremente. O resumo usa os registros reais da sessão, não o exemplo de 162 pessoas / 2 h 40 min do SVG.

## Dados e limites da simulação

- Dados salvos em `localStorage`, apenas neste navegador e domínio. Abas no mesmo domínio atualizam os dados entre si; não há comunicação entre dispositivos.
- O mapa é ilustrativo, idêntico ao SVG; não usa GPS nem navegação real.
- Estoque inicial: 25 kg de feijão, 34 kg de legumes, 12 kg de macarrão. Metas: 50, 40 e 40 kg.
- Receita fictícia para ligar doação e capacidade: 10 porções/kg de feijão e legumes e 85/12 porções/kg de macarrão. A capacidade é o menor rendimento dos três insumos. “Outro” é armazenado, mas não entra nessa receita.
- A rota permanece com as cinco paradas do desenho (85 refeições); doações aumentam a capacidade, mas não acrescentam automaticamente o Parque Sul. Não há baixa de ingredientes ao entregar: a projeção representa a capacidade de produção, não um controle real de cozinha.
- A validade começa em 30 dias após a data atual para evitar uma doação já vencida. Não há gestão real de lotes.
- O registro pode ser desfeito antes de avançar. A duração é medida desde a entrada do voluntário até a última entrega.
- Após finalizar, uma nova entrada como voluntário inicia outra ronda e preserva as doações e o estoque.
- Para reiniciar todos os dados de uma avaliação, remova a chave `pao-fraterno-prototipo-v1` do armazenamento local nas ferramentas do navegador ou use uma nova janela anônima.

## Fidelidade e acessibilidade

Todas as telas usam HTML responsivo, preservando cores, componentes e mapas dos SVGs, sem reduzir textos e controles junto com a prancheta inteira. No desktop a partir de 1.200 px, a estrutura ocupa toda a largura da janela, com menu lateral de 220 px que cobre toda a altura e conteúdo flexível sem largura máxima centralizada. Há suporte a Tab, Enter e Espaço, identificação dos botões, foco visível, mensagens de estado e bloqueio de confirmação duplicada.

Login e telas de campo usam layout flexível com até 480 px, respeitando a altura útil e a área segura do dispositivo. Abaixo de 1.200 px, o coordenador usa navegação superior e painéis em duas colunas; abaixo de 700 px, os painéis ficam empilhados. Em telas estreitas, o gráfico vira barras horizontais legíveis, o formulário permite quebra das opções de alimentos e as listas adaptam as quantidades sem rolagem horizontal. Redimensionar a janela preserva a doação em edição e o progresso da ronda.

## Testes automatizados (opcional)

Com Node.js instalado, execute `npm install` e `npx playwright install chromium`. Gere o site, deixe o servidor ativo na porta 8013 (`npm start`) e, em outro terminal, execute `npm test`. A variável `TEST_URL` permite testar outra porta ou o endereço publicado. Os testes verificam os dois fluxos, validação, persistência, desfazer, resumo e largura mobile. Capturas de tela são salvas em `/tmp/opencode`.
