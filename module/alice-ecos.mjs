/**
 * Inicialização do Sistema Alice - Ecos no País das Maravilhas
 * Engine E.C.C.O.S. (Vanilla)
 */

// 1. CLASSE DA FICHA DE ATOR (Personagens e Espelhados)
class AliceActorSheet extends ActorSheet {
  // Define as configurações padrão da janela da ficha
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["alice-ecos", "sheet", "actor"], // Classes CSS para estilização
      template: "systems/alice-ecos/templates/actor/alice-sheet.html", // O caminho do HTML
      width: 800,
      height: 650,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "atributos",
        },
      ],
    });
  }

  getData() {
    const context = super.getData();
    context.systemData = context.actor.system;

    // Baús para separar os itens
    const conceitosForma = [];
    const conceitosLogica = [];
    const conceitosDevaneio = [];
    const conceitosDefeitos = [];
    const itensDeBolso = [];

    for (let i of context.actor.items) {
      console.log(i.system.atributo_vinculado);
      if (i.type === "conceito") {
        let vinculo = i.system.atributo_vinculado
          ? i.system.atributo_vinculado.toLowerCase()
          : "";
        if (vinculo === "forma") conceitosForma.push(i);
        else if (vinculo === "logica" || vinculo === "lógica")
          conceitosLogica.push(i);
        else if (vinculo === "devaneio") conceitosDevaneio.push(i);
        else if (vinculo === "defeito") conceitosDefeitos.push(i);
      } else if (i.type === "item_bolso") {
        itensDeBolso.push(i);
      }
    }

    context.conceitosForma = conceitosForma;
    context.conceitosLogica = conceitosLogica;
    context.conceitosDevaneio = conceitosDevaneio;
    context.conceitosDefeitos = conceitosDefeitos;
    context.itensDeBolso = itensDeBolso;

    return context;
  }

  // NOVA PARTE: Ativando os botões de interatividade (Versão Blindada)
  activateListeners(html) {
    super.activateListeners(html);

    // Se o jogador não for dono da ficha, ele não pode editar ou deletar nada
    if (!this.isEditable) return;

    // BOTÃO DE EDITAR: Abre a janela do Item
    html.find(".item-edit").click((ev) => {
      ev.preventDefault(); // Evita que o clique faça a tela pular
      const caixaDoItem = $(ev.currentTarget).closest(".item");
      const itemId = caixaDoItem.data("itemId");
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // BOTÃO DE DELETAR: Remove o item do banco de dados (Rasga a carta)
    html.find(".item-delete").click((ev) => {
      ev.preventDefault();
      const caixaDoItem = $(ev.currentTarget).closest(".item");
      const itemId = caixaDoItem.data("itemId");

      // Abre uma caixa de confirmação rápida para não apagar sem querer
      new Dialog({
        title: "Rasgar Carta?",
        content:
          "<p>Tem certeza que deseja rasgar e esquecer este Conceito/Item para sempre?</p>",
        buttons: {
          sim: {
            icon: '<i class="fas fa-trash"></i>',
            label: "Sim, rasgue!",
            callback: () => {
              this.actor.deleteEmbeddedDocuments("Item", [itemId]);
            },
          },
          nao: {
            icon: '<i class="fas fa-times"></i>',
            label: "Não, guarde.",
          },
        },
        default: "nao",
      }).render(true);
    });

    // BOTÃO DE EXPANDIR: Mostrar a descrição do Conceito na ficha
    html.find(".item-name").click((ev) => {
      ev.preventDefault();
      // Encontra o item específico que foi clicado
      const li = $(ev.currentTarget).closest(".item");
      // Encontra a gaveta de descrição escondida dentro dele
      const summary = li.find(".item-summary");
      const icone = $(ev.currentTarget).find("i");

      // Faz o efeito sanfona (deslizar para baixo/cima)
      summary.slideToggle(200);

      // Gira a setinha para baixo
      if (icone.hasClass("fa-caret-right")) {
        icone.removeClass("fa-caret-right").addClass("fa-caret-down");
      } else {
        icone.removeClass("fa-caret-down").addClass("fa-caret-right");
      }
    });

    // ========================================================
    // ROLANDO O ABSURDO (A Mecânica E.C.C.O.S.)
    // ========================================================
    html.find(".rollable").click(async (ev) => {
      ev.preventDefault();
      const attrName = ev.currentTarget.dataset.attr; // descobre qual foi clicado
      const attrValue = this.actor.system.atributos[attrName].value || 0; // pega o valor

      // Cria a Janela de Diálogo (O Coelho perguntando)
      const dialogContent = `
        <div style="font-family: 'Poppins', sans-serif; background: #1a0a29; color: #fff; padding: 10px; border-radius: 8px; margin-bottom: 7px;">
          <h2 style="color: #00ffff; text-align: center; border-bottom: 1px solid #ff007f;">O Absurdo Chama (${attrName.toUpperCase()})</h2>
          
          <div style="margin-bottom: 10px;">
            <label style="color: #ffe135;">Dificuldade (1 a 3):</label>
            <input type="number" id="roll-diff" value="1" min="1" max="10" style="width: 100%; text-align: center; font-weight: bold; background: #fff; color: #000;"/>
          </div>

          <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="roll-conceito" style="width: 20px; height: 20px;"/>
            <label style="color: #ff007f; font-weight: bold;">Usar Conceito Relevante?</label>
            <small style="color: #aaa;">(+1 Dado, -1 Dificuldade)</small>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="color: #ffe135;">Vivência (Profissão/Passado):</label>
            <select id="roll-vivencia" style="width: 100%; background: #fff; color: #000; font-weight: bold; padding: 3px;">
              <option value="0">Não se aplica (+0 Dados)</option>
              <option value="1">Aplica Indiretamente (+1 Dado)</option>
              <option value="2">Aplica Diretamente (+2 Dados)</option>
            </select>
          </div>
        </div>
      `;

      new Dialog({
        title: "Rolando os Dados...",
        content: dialogContent,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice"></i>',
            label: "Rolar!",
            callback: async (htmlDialog) => {
              // Pegando as respostas do jogador
              const baseDiff = parseInt(htmlDialog.find("#roll-diff").val());
              const usaConceito = htmlDialog
                .find("#roll-conceito")
                .is(":checked");
              const bonusVivencia = parseInt(
                htmlDialog.find("#roll-vivencia").val(),
              );

              // A FÓRMULA MATEMÁTICA
              const numDados = Math.max(
                1,
                attrValue + (usaConceito ? 1 : 0) + bonusVivencia,
              );
              const finalDiff = Math.max(0, baseDiff - (usaConceito ? 1 : 0)); // Dificuldade cai em 1

              // Jogando os Dados
              let roll = await new Roll(`${numDados}d6`).evaluate({
                async: true,
              });

              // Lendo as Faces do Destino
              let acertos = 0;
              let custos = 0; // Os 4s
              let falhasFatais = 0; // Os 1s

              let facesHtml = ""; // Para desenhar os dados no chat

              roll.terms[0].results.forEach((d) => {
                let face = d.result;
                let classeDado = "dado-neutro";

                if (face >= 5) {
                  acertos++;
                  classeDado = "dado-acerto";
                } else if (face === 4) {
                  custos++;
                  classeDado = "dado-custo";
                } else if (face === 1) {
                  falhasFatais++;
                  classeDado = "dado-falha";
                }

                facesHtml += `<span class="alice-die ${classeDado}">${face}</span>`;
              });

              // JULGANDO O RESULTADO
              let tituloResultado = "";
              let classeResultado = "";

              if (acertos === 0 && falhasFatais >= 2) {
                tituloResultado =
                  "👁️ OLHOS DE CHESHIRE 👁️<br><small>Falha Crítica (Catástrofe)</small>";
                classeResultado = "chat-crit-fail";
              } else if (finalDiff > 0 && acertos >= finalDiff * 2) {
                tituloResultado =
                  "👑 DECRETO DA RAINHA 👑<br><small>Sucesso Crítico Absoluto</small>";
                classeResultado = "chat-crit-success";
              } else if (acertos >= finalDiff) {
                tituloResultado =
                  "✨ SUCESSO ✨<br><small>Ação Concluída</small>";
                classeResultado = "chat-success";
              } else if (acertos + custos >= finalDiff) {
                tituloResultado =
                  "🩸 SUCESSO COM CUSTO 🩸<br><small>Gaste os 4s mediante um Preço</small>";
                classeResultado = "chat-costly";
              } else {
                tituloResultado =
                  "🥀 FALHA 🥀<br><small>O Absurdo Venceu</small>";
                classeResultado = "chat-fail";
              }

              // MONTANDO A CARTA PARA O CHAT
              const chatCardHtml = `
                <div class="alice-chat-card color-${attrName}">
                  <div class="chat-header">
                    <h3>Teste de ${attrName.toUpperCase()}</h3>
                    <div class="chat-stats">
                      <span>Dificuldade: <strong>${finalDiff}</strong></span>
                      <span>Total de Dados: <strong>${numDados}d6</strong></span>
                    </div>
                  </div>
                  <div class="chat-dados">
                    ${facesHtml}
                  </div>
                  <div class="chat-resultado ${classeResultado}">
                    ${tituloResultado}
                  </div>
                </div>
              `;

              // Mandando para o Chat
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                content: chatCardHtml,
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                roll: roll,
              });
            },
          },
        },
        default: "roll",
      }).render(true);
    });
  }
}

// 2. CLASSE DA FICHA DE ITEM (Conceitos, Debitos, Itens de Bolso)
class AliceItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["alice-ecos", "sheet", "item"],
      template: "systems/alice-ecos/templates/item/conceito-sheet.html",
      width: 500,
      height: 400,
    });
  }

  getData() {
    const context = super.getData();
    context.systemData = context.item.system;
    return context;
  }
}

// 3. O GATILHO DE INICIALIZAÇÃO (O Hook 'init')
// Este é o momento exato em que o País das Maravilhas acorda.
Hooks.once("init", async function () {
  console.log(
    "♠ ♥ Alice E.C.C.O.S. | Iniciando a descida pela toca do coelho... ♣ ♦",
  );

  // Removemos as fichas padrão (core) do Foundry para limpar o terreno
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Registramos as nossas fichas customizadas
  Actors.registerSheet("alice-ecos", AliceActorSheet, { makeDefault: true });
  Items.registerSheet("alice-ecos", AliceItemSheet, { makeDefault: true });
});
