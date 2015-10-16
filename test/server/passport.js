// passport.js

var rs  = require( 'toubkal' )
  
  , logger        = require(     'morgan'      )
  , cookie_parser = require(  'cookie-parser'  )
  , body_parser   = require(   'body-parser'   )
  , session       = require( 'express-session' )
  
;

require( 'toubkal/lib/server/passport.js' );

var RS  = rs.RS
  , log = RS.log
  , de  = true
  
  , extend = RS.extend
;

function ug( message ) { log( 'passport, ' + message ) }

module.exports = function( express, session_options, application, base_route, base_url ) {
  // Define in-memory database
  var schemas = rs.set( [
    { id: 'user_profile' },
    { id: 'user_provider_profile', key: [ 'user_id', 'provider_id' ] },
    { id: 'user_provider_email' }
  ] );
  
  var database = rs.dispatch( schemas, function( source, options ) {
    var flow = this.id;
    
    return source
      .flow( flow, { key: this.key } )
      // .mysql( flow, this.columns )
      .set( [] )
      .flow( flow )
    ;
  } );
  
  // Passport user profiles
  database
    .flow( 'user_profile' )
    
    .passport_profiles()
    
    .alter( function( user ) {
      // New user profile from provider profile
      var _ = user.profile;
      
      var profile = {
        flow         : 'user_profile',
        id           : user.id,
        provider_name: user.provider_name,
        provider_id  : user.provider_id,
        name         : _.displayName,
        emails       : _.emails,
        photo        : _.photos[ 0 ].value
      };
      
      de&&ug( 'new user profile:', profile );
      
      return profile;
    }, { no_clone: true } )
    
    ._add_destination( database )
  ;
  
  rs
    .passport_strategies( base_url + base_route )
    
    .passport()
    
    ._output.on( 'middleware', app_config )
  ;
  
  var initialized = false;
  
  function app_config( passport, passport_routes ) {
    if ( initialized ) return;
    
    initialized = true;
    
    application
      .use( logger()                   ) // request logger middleware
      .use( cookie_parser()            ) // cookie parser
      .use( body_parser()              ) // extensible request body parser
      .use( session( session_options ) ) // session management
      .use( passport.initialize()      )
      .use( passport.session()         )
      .use( passport_routes()          )
    ;
  } // app_config()
} // module.exports
