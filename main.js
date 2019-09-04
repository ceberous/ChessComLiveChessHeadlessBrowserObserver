const process = require( "process" );
const path = require( "path" );
// const child = require( "child_process" );
const puppeteer = require( "puppeteer" );
const request = require( "request" );


const PersonalFilePath = path.join( process.env.HOME , ".config" , "personal" , "chess_com_live_chess_headless_browser_observer.js" );
const Personal = require( PersonalFilePath );
function sleep( ms ) { return new Promise( resolve => setTimeout( resolve , ms ) ); }


process.on( "unhandledRejection" , function( reason , p ) {
	console.error( reason, "Unhandled Rejection at Promise" , p );
	console.trace();
});
process.on( "uncaughtException" , function( err ) {
	console.error( err , "Uncaught Exception thrown" );
	console.trace();
});


// function MAKE_REQUEST( wURL ) {
// 	return new Promise( function( resolve , reject ) {
// 		try {
// 			request( { url: wURL , headers: { "Cache-Control": "private, no-store, max-age=0" } } , function ( err , response , body ) {
// 				if ( err ) { resolve( false ); return; }
// 				console.log( wURL + "\n\t--> RESPONSE_CODE = " + response.statusCode.toString() );
// 				if ( response.statusCode !== 200 ) {
// 					//console.log( "bad status code ... " );
// 					resolve( false );
// 					return;
// 				}
// 				else {
// 					resolve( body );
// 					return;
// 				}
// 			});
// 		}
// 		catch( error ) { console.log( error ); reject( error ); }
// 	});
// }

// async function PROMISE_ALL() {
//     try {
//         const a = MAKE_REQUEST( "https://swapi.co/api/people/1" );
//         const b = MAKE_REQUEST( "https://swapi.co/api/people/1" );
//         const results = await Promise.all( [ a , b ] );
//         return results;
//     }
//     catch( error ) { console.log( error ); return false; }
// }


( async ()=> {


	const browser = await puppeteer.launch({ headless: true , defaultViewport: null });
	const page = await browser.newPage();

	//await page.setViewport({ width: 1280, height: 800 });
	await page.goto( "https://www.chess.com/login" );

	await page.type('input[type="email"]', Personal.login_info.username );

	await page.waitForSelector('input[type="password"]' , { visible: true } );
	await page.type('input[type="password"]' , Personal.login_info.password );

	await Promise.all([
		page.$eval( 'button#login', button => button.click() ) ,
		//page.waitForNavigation({ waitUntil: 'networkidle0' })
		await page.waitForSelector('section.new-game-container' , { visible: true } )
	]);

	await page.goto( "https://www.chess.com/live" );
	await page.waitForSelector( 'li[data-tab="players"]' , { visible: true } );
	await page.$eval( 'li[data-tab="players"]' , button => button.click() );

	await page.waitForSelector( "div.players-list-component" );
	// await page.waitForNavigation();
	// await page.screenshot({ path: 'test.png', fullPage: true });

	await page.evaluate( async () => {
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
					const rank = data[ 0 ].split( "#" )[ 1 ];
					const name_rating = data[ 1 ].split( "(" );
					const name = name_rating[ 0 ].trim();
					const rating = name_rating[ 1 ].split( ")" )[ 0 ];
					//if ( !latest_players[ rank ] ) { latest_players[ rank ] = {}; }
					// latest_players[ rank ].name = name;
					// latest_players[ rank ].rating = rating;
					// latest_players[ rank ].status = data[ 2 ];
					latest_players.push({
						name: name ,
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
	});

	page.on( 'console' , async ( msg ) => {
		let parsed = false;
		try {
			parsed = JSON.parse( msg._text );
		}
		catch ( error ) { parsed = false; }
		if ( !parsed ) { return; }

		console.log( "Updated Playerlist === " );
		//console.log( parsed );
		const now_playing = parsed.filter( player => player.status === "Playing" );
		console.log( now_playing );
	});

	//await browser.close()

})();