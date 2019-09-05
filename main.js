const process = require( "process" );
const path = require( "path" );
const puppeteer = require( "puppeteer" );
const request = require( "request" );

function sleep( ms ) { return new Promise( resolve => setTimeout( resolve , ms ) ); }

const PersonalFilePath = path.join( process.env.HOME , ".config" , "personal" , "chess_com_live_chess_headless_browser_observer.js" );
const Personal = require( PersonalFilePath );

process.on( "unhandledRejection" , function( reason , p ) {
	console.error( reason, "Unhandled Rejection at Promise" , p );
	console.trace();
});
process.on( "uncaughtException" , function( err ) {
	console.error( err , "Uncaught Exception thrown" );
	console.trace();
});

//<div data-notification="disconnectAnnounce" class="toaster-component toaster-alert" style="bottom: 0px;"><i class="toaster-icon icon-circle-danger"></i> <div class="toaster-message-component"><!----> <div class="warn-message-component toaster-message-content">Are you still there? - <a data-link="0" class="notification-disconnect-announce">Yes, I am here!</a></div></div> <!----></div>

function watch_for_disconnect_notice() {
	const disconnect_notice_obvserver_config = {
		attributes: true,
		childList: true,
		characterData: true,
		subtree: true
	};
	const disconnect_notice_obvserver = new MutationObserver( ( mutations )=> {
		mutations.forEach( ( mutation , index )=> {
			if ( mutation.type !== "childList" ) { return; }
			if ( mutation.target !== "div.notification-component" ) { return; }
			setTimeout( ()=>{
				const button = document.querySelector( "a.notification-disconnect-announce" );
				button.click();
				console.log( "Clicked the Re-Join Button ?" );
			} , 5000 );
			console.log( mutation );
		});
	});
	disconnect_notice_obvserver.observe( document.body , disconnect_notice_obvserver_config );
}

function observe_top_players_list() {
	const top_players_list = document.querySelector( "div.players-list-component" );

	// function scroll_to_top() {
	// 	top_players_list.scrollTop = 0;
	// }

	// function scroll_to_bottom() {
	// 	top_players_list.scrollTop = top_players_list.scrollHeight;
	// 	parse_userlist();
	// }

	// function custom_scroll_gatherer() {
	// 	setTimeout( scroll_to_bottom , 500 );
	// 	setTimeout( scroll_to_bottom , 1000 );
	// 	setTimeout( scroll_to_bottom , 1500 );
	// 	// setTimeout( scroll_to_bottom , 2000 );
	// 	// setTimeout( scroll_to_bottom , 2500 );
	// 	// setTimeout( scroll_to_bottom , 3000 );
	// 	// setTimeout( scroll_to_bottom , 3500 );
	// 	// setTimeout( scroll_to_bottom , 4000 );
	// 	setTimeout( scroll_to_top , 2000 );
	// }

	//let latest_players = {};
	function parse_userlist() {
		let latest_players = [];
		top_players_list.childNodes.forEach( ( data_page , page_index )=> {
			data_page.childNodes.forEach( ( player , player_index )=> {
				if ( !!!player.innerText ) { return; }
				const data = player.innerText.split( "\n" );
				if ( !!!data[ 0 ] ) { return; }
				if ( !!!data[ 1 ] ) { return; }
				if ( !!!data[ 2 ] ) { return; }
				let title = false;
				const rank = data[ 0 ].split( "#" )[ 1 ];
				const name_rating = data[ 1 ].split( "(" );
				let username = name_rating[ 0 ].trim();
				const title_test = username.split( " " );
				if ( title_test.length > 0 ) { title = title_test[ 0 ]; username = title_test[ 1 ]; }
				const rating = name_rating[ 1 ].split( ")" )[ 0 ];
				//if ( !latest_players[ rank ] ) { latest_players[ rank ] = {}; }
				// latest_players[ rank ].username = username;
				// latest_players[ rank ].rating = rating;
				// latest_players[ rank ].status = data[ 2 ];
				latest_players.push({
					title: title ,
					username: username ,
					rank: rank ,
					rating: rating ,
					status: data[ 2 ]
				});
			});
		});
		console.log( JSON.stringify( latest_players ) );
	}
	const top_players_observer = new MutationObserver( ( mutations )=> {
		parse_userlist();
		//custom_scroll_gatherer();
	});
	const top_players_observer_config = {
		attributes: true,
		childList: true,
		characterData: true,
		subtree: true
	};
	//custom_scroll_gatherer();
	top_players_list.scrollTop = top_players_list.scrollHeight;
	parse_userlist();
	setTimeout( top_players_observer.observe( top_players_list , top_players_observer_config ) , 2000 );
}

( async ()=> {

	const browser = await puppeteer.launch({ headless: true , defaultViewport: null });
	const page = await browser.newPage();
	//await page.setViewport({ width: 1280, height: 800 });

	// 1.) Login
	await page.goto( "https://www.chess.com/login" );
	await page.waitForSelector( 'input[type="password"]' , { visible: true } );
	await page.type( 'input[type="email"]' , Personal.login_info.username );
	await page.type( 'input[type="password"]' , Personal.login_info.password );
	await Promise.all([
		page.$eval( "button#login" , button => button.click() ) ,
		await page.waitForSelector( "section.new-game-container" , { visible: true } )
	]);

	// 2.) Go To chess.com/live
	await page.goto( "https://www.chess.com/live" );
	await page.waitForSelector( 'li[data-tab="players"]' , { visible: true } );
	await page.$eval( 'li[data-tab="players"]' , button => button.click() );

	// 3.) Obvserve Top Players List
	await page.waitForSelector( "div.players-list-component" );
	await page.evaluate( observe_top_players_list );

	// 4.) Watch for Disconnect Notice
	await page.evaluate( watch_for_disconnect_notice );

	// 5.) Listen for Sent Player List Updates
	page.on( "console" , async ( msg ) => {
		let parsed = false;
		try { parsed = JSON.parse( msg._text ); }
		catch ( error ) { parsed = false; }
		if ( !parsed ) { return; }
		console.log( "\nUpdated Playerlist === " );
		//console.log( parsed );
		const now_playing = parsed.filter( player => player.status === "Playing" );
		const now_playing_gms = now_playing.filter( player => player.title === "GM" );
		console.log( now_playing_gms );
	});

	// await page.waitForNavigation();
	// await page.waitForNavigation({  waitUntil: 'networkidle0' })
	// await page.screenshot({ path: 'test.png', fullPage: true });
	// await browser.close();

})();