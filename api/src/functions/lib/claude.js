// Gedeelde helper om een Claude-respons robuust uit te lezen (#72/#71). Filtert alle text-blocks
// en plakt ze aan elkaar i.p.v. blind content[0].text te pakken — voorkomt een crash of vervuilde
// output als het eerste content-block geen tekst is (bv. een leeg block of tool_use).
function leesClaudeTekst(response) {
  return (response && Array.isArray(response.content) ? response.content : [])
    .filter((b) => b && b.type === "text")
    .map((b) => b.text)
    .join("\n")
}

module.exports = { leesClaudeTekst }
