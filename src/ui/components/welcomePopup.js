export function showWelcomePopup() {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "welcome-modal-overlay";

  const modalContent = document.createElement("div");
  modalContent.className = "welcome-modal-content";

  const title = document.createElement("h2");
  title.textContent = "Wersja Cyfrowa Atlasu Językowego Kaszubszczyzny";

  const subtitle1 = document.createElement("h3");
  subtitle1.textContent = "Cel";

  const generalMessage = document.createElement("p");
  generalMessage.textContent = "Ta strona prezentuje działanie środowiska do digitalizacji atlasów gwarowych i językowych. Jako przykład wybrano mapy i punkty z Atlasu Językowego Kaszubszczyzny. Interfejs opartemy na \"klikaniu\" i \"przeciąganiu myszką\" pozwala na bardzo szybką digitalizację map z różnych atlasów językowych nawet osobom słabo radzącym sobie z komputerem.";

  const subtitle2 = document.createElement("h3");
  subtitle2.textContent = "Stawka";

  const stakeMessage = document.createElement("p");
  stakeMessage.textContent = "Wydane w Polsce atlasy językowe obejmują tysiące map językowych bardzo wysokiej jakości. Liczba wszystkich punktów na opracowanych w systematyczny sposób i wydanych w Polsce mapach sięga być może nawet miliona. Te dane nie są obecnie dostępne do bezpośredniego wykorzystania do badań ilościowych. Dzięki digitalizacji, dane z atlasów mogą być łatwo udostępnione w Internecie oraz wykorzystane do ilościowych analiz (geo-)lingwistycznych. Możliwe będzie także powiązanie geograficzne danych lingwistycznych z innymi bazami danych na temat polskiej geografii społecznej, ekonomicznej i geografii historycznej.";


  const okButton = document.createElement("button");
  okButton.textContent = "OK";
  okButton.className = "welcome-ok-button";
  okButton.onclick = () => {
    modalOverlay.remove();
  };

  modalContent.appendChild(title);
  modalContent.appendChild(subtitle1);
  modalContent.appendChild(generalMessage);
  modalContent.appendChild(subtitle2);
  modalContent.appendChild(stakeMessage);
  modalContent.appendChild(okButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}