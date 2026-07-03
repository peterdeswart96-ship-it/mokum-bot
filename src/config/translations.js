// Mokum Magic 8 Ball — Vertalingen
// Config-bron (#75): één bron voor widget.js én de React-build.
// Bewerk de teksten in public/configs/default.json (texts.nl / texts.en), NIET hier.
// Geleverd in de vorm die ChatWidget.jsx verwacht: translations[lang].<key>.
import cfg from "../../public/configs/default.json"

// Eigen (mutabel) object per taal, met een eigen questions-kopie, zodat de
// standaardvragen-useEffect (translations[lang].questions[ond] = ...) niet de
// gedeelde JSON-import muteert.
const build = (lang) => {
  const t = { ...cfg.texts[lang] }
  t.questions = { ...cfg.texts[lang].questions }
  return t
}

const translations = { nl: build("nl"), en: build("en") }

export default translations
