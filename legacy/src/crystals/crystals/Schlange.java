/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.io.IOException;
import java.util.ArrayList;


public class Schlange extends Kreatur
{
	public Schlange(int x, int y)
	{
		super(x, y);
		init();
	}

	public Schlange()
	{
		init();
	}

	private void writeObject(java.io.ObjectOutputStream stream) throws IOException
	{
		stream.writeInt(level);
		stream.writeInt(ruestung);
		stream.writeInt(schaden);
		stream.writeInt(maxLeben);
		stream.writeFloat(abbauzeit);
		stream.writeFloat(angriffszeit);
		stream.writeFloat(regenerationszeit);
		stream.writeFloat(laufgeschwindigkeit);
		stream.writeFloat(letztePosx);
		stream.writeFloat(letztePosy);
		stream.writeFloat(posX);
		stream.writeFloat(posY);
		stream.writeInt(leben);
		stream.writeInt(weg.size());
		for (int i = 0; i < weg.size(); i++)
		{
			stream.writeObject(weg.get(i));
		}
	}

	private void readObject(java.io.ObjectInputStream stream) throws IOException,
			ClassNotFoundException
	{
		init();
		level = stream.readInt();
		ruestung = stream.readInt();
		schaden = stream.readInt();
		maxLeben = stream.readInt();
		abbauzeit = stream.readFloat();
		angriffszeit = stream.readFloat();
		regenerationszeit = stream.readFloat();
		laufgeschwindigkeit = stream.readFloat();
		letztePosx = stream.readFloat();
		letztePosy = stream.readFloat();
		posX = stream.readFloat();
		posY = stream.readFloat();
		leben = stream.readInt();
		int s = stream.readInt();
		weg = new ArrayList<>();
		for (int i = 0; i < s; i++)
		{
			weg.add((Befehl) (stream.readObject()));
		}
		Regenerieren r = new Regenerieren();
		r.start();
	}

	private void init()
	{
		drectionlastmoved = 's';
		ruestung = 5;
		maxLeben = 10;
		leben = 10;
		laufgeschwindigkeit = 0.0003f;
		angriffszeit = 1f;
		abbauzeit = 0;
		schaden = 14;
		regenerationszeit = 30;
		loadSprite("Schlange");
	}

	@Override
	public void levelup()
	{
		level++;
		maxLeben *= 1.1f;
		leben *= 1.1f;
		regenerationszeit *= 0.8f;
		angriffszeit *= 0.9f;
		schaden *= 1.15f;
	}
}
