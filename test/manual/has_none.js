/*
  Should show:
 
  2016/03/23 11:42:05.728 - Trace( has_none )..fetched(),  {
    "no_more": true,
    "adds": [],
    "source": "Set.Output( has_none #11 )",
    "query": [
      {}
    ],
    "query_changes": [
      [],
      [
        {}
      ]
    ]
  }
  ----------------------- + 1 second 30 milliseconds -----------------------
  2016/03/23 11:42:06.758 - Trace( has_none )..add(),  {
    "values": [
      {
        "id": 1
      }
    ]
  }

*/
require( 'toubkal/lib/core' )
  .Singleton( 'source', function( source, options ) {
    return source.set( [ { id : 2 } ] )
  } )
  
  .source()
//  .trace( 'source' )
  .delay( 10 )
  .has_none()
  .trace( 'has_none', { all: false } )
  .greedy()
  
  // --------------------
  .namespace()
  .once( 1000 )
  .flat_map( function( _ ) { return [ { id: 2 } ] } )
//  .trace( 'once' )
  .revert()
  .source()
  
  // ------------------------
  .namespace()
  //.once( 2000 )
  .flat_map( function( _ ) { return [ { id: 5 } ] } )
  .source()
;


