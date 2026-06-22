# Mokum Bot — WordPress Embed Snippet

## Snippet voor Nick & Mark

Plakken via WPCode plugin in WordPress:

```html
<script src="https://mokum-bot.pdscloud.nl/widget.js" async defer></script>
```

## Installatie instructies

1. Installeer plugin **WPCode** via WordPress dashboard → Plugins → Nieuwe plugin
2. Ga naar **Code Snippets → Headers & Footers**
3. Plak de snippet in het **Body/Footer** veld
4. Klik **Save Changes** — klaar

## Widget URL

`https://mokum-bot.pdscloud.nl/widget.js`

## Testen via browser console

```javascript
var s = document.createElement('script');
s.src = 'https://mokum-bot.pdscloud.nl/widget.js';
document.body.appendChild(s);
```
