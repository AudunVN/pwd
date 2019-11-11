/*
	dialog.js

	Handles displaying simple dialog windows shown in response to user inputs.
*/

/* default template used for rendering the dialog window */
const DIALOG_TEMPLATE_HTML = '' +
    '<div class="dialog">' +
        '<div class="dialog-header"><h4 class="dialog-title"></h4><button class="close-dialog-button button">&times;</button></div>' +
        '<div class="dialog-content">' +
            '<p>test</p>' +
        '</div>' +
        '<div class="dialog-footer"></div>' +
    '</div>';

function hideDialog() {
	document.querySelector("body").classList.remove("dialog-visible");
}

function showDialog(title, contentHtml, footerHtml, onRenderCallback) {
	/* 
		shows a dialog window.
		title: any html that is legal inside a h4 element, shows up in the title of the dialog.
		contentHtml: any html, shows up in the dialog body.
		footerHtml: any html, shows up in the footer. contains a close button by default.
		onRenderCallback: function, runs after the dialog is finished rendering. useful for adding buttons.
	*/

    let body = document.querySelector("body");

	/* create dialog container if it doesn't exist */
    if (!document.querySelector(".dialog-backdrop")) {
        let dialogContainer = document.createElement("div");
		dialogContainer.className = "dialog-backdrop";
		dialogContainer.innerHTML = DIALOG_TEMPLATE_HTML;
		body.appendChild(dialogContainer);   
	}
	
	let dialog = document.querySelector(".dialog");
	
	/* check if we already have an open dialog */
    if (body.classList.contains("dialog-visible") && !dialog.classList.contains("dialog-hidden")) {
        /* hide current dialog, open new one after a delay to give it time to close */
        dialog.classList.add("dialog-hidden");
        setTimeout(function(){ showDialog(title, contentHtml, footerHtml, onRenderCallback); }, 500);
        return;
    }
	
	let dialogContainer = document.querySelector(".dialog-backdrop");
	
	/* set up dialog contents */
	let outputTitle = 'Dialog';
	let outputContentHtml = '<p>No content specified</p>';
	let outputFooterHtml = '<button class="button close-dialog-button">Close</button>';
	
	if (title && title.length > 0) {
		outputTitle = title;
	}
	
	if (contentHtml && contentHtml.length > 0) {
		outputContentHtml = contentHtml;
	}
	
	if (footerHtml && title.length > 0) {
		outputFooterHtml = footerHtml;
	}
	
	dialog.querySelector(".dialog-title").innerHTML = outputTitle;
	dialog.querySelector(".dialog-content").innerHTML = outputContentHtml;
	dialog.querySelector(".dialog-footer").innerHTML = outputFooterHtml;
	
	/* bind button event listeners */
    let closeButtons = dialog.getElementsByClassName("close-dialog-button");
	
	for (let i = 0; i < closeButtons.length; i++) {
		 closeButtons[i].addEventListener('click', hideDialog);
    }
	
	dialogContainer.addEventListener('click', hideDialog);
	dialog.addEventListener('click', function(e){e.stopPropagation();});
	
	/* run callback function if set */
	if (onRenderCallback) {
		onRenderCallback();
	}
	
	/* show dialog */
    body.classList.add("dialog-visible");
	dialog.classList.remove("dialog-hidden");

	return dialog;
}