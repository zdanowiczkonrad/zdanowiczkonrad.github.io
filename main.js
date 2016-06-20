const decode = atob;
const codes = {
	phone: 'KzQ4IDY2MyA1MjUgMTIx',
	mail: 'emRhbm93aWN6LmtvbnJhZEBnbWFpbC5jb20='
};

function actCool(oldText, text, timeout, write, done) {
	const cypher = oldText.split('');

	function actCoolAt(index) {
		if (index >= text.length && index >= oldText.length) {
			done();
		}
		else {
			cypher[index] = text[index] || '';
			write(cypher.join(''));
			setTimeout(function(){actCoolAt(index + 1)}, timeout);
		}
	}

	actCoolAt(0, oldText);
}

const clickListener = function(event)  {
	event.stopPropagation();
    event.preventDefault();
	const element = event.target;
	
	if (!element.classList.contains('js-requested')) {
		element.classList.add('js-requested');

		const $hash = document.createElement('span');
		$hash.classList.add('hash');
		const hash = codes[event.target.getAttribute('data-value')];
		
		$hash.innerHTML = hash;
		event.target.parentElement.appendChild($hash);

		setTimeout(function() {
			actCool(hash, decode(hash), 100, function(text) {$hash.innerHTML = text;}, function() {
				element.classList.add('js-request-finished');
			});
		}, 1000);
	}
};

Array.from(document.querySelectorAll('.js-request-pi'))
.forEach(function(element) {
	element.addEventListener('click', clickListener);
	element.addEventListener('touchstart', clickListener);
});

const pallete = 'ABCDEFGHIKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
